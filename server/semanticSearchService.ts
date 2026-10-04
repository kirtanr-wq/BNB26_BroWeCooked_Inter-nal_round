import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import { db, DBContentChunk } from './db';

export const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
export const EMBEDDING_DIMENSION = 768;

export interface SemanticSearchResult {
  id: string;
  projectId?: string;
  assetId?: string;
  transcriptId?: string;
  videoTitle?: string;
  thumbnailUrl?: string;
  text: string;
  startTime: number;
  endTime: number;
  timeRange: string;
  similarity: number;
  similarityPercentage: number;
  scoreLabel: string;
}

export interface ChunkMetadata {
  userId: string;
  projectId?: string;
  assetId?: string;
  transcriptId?: string;
  text: string;
  segments?: Array<{
    text: string;
    seconds: number;
    speaker?: string;
  }>;
  duration?: number;
}

export class SemanticSearchService {
  private client: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (!this.client) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured on the server.');
      }
      this.client = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-creatorai-semantic-search',
          },
        },
      });
    }
    return this.client;
  }

  /**
   * Helper to format seconds into MM:SS
   */
  public formatTime(sec: number): string {
    const mins = Math.floor(sec / 60);
    const remainingSec = Math.floor(sec % 60);
    return `${String(mins).padStart(2, '0')}:${String(remainingSec).padStart(2, '0')}`;
  }

  /**
   * Calculate SHA-256 hash to detect changes and avoid re-embedding unchanged transcripts
   */
  public computeHash(text: string): string {
    return crypto.createHash('sha256').update(text.trim()).digest('hex');
  }

  /**
   * Cosine similarity between two float vectors
   */
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Splits a transcript into timestamp-aligned semantic chunks (150-300 words).
   */
  public chunkTranscript(params: ChunkMetadata): Array<{
    text: string;
    startTime: number;
    endTime: number;
    chunkIndex: number;
  }> {
    const { text, segments, duration = 30 } = params;
    const cleanText = text.trim();
    if (!cleanText) return [];

    // Case 1: Structured segments with timestamps exist
    if (segments && segments.length > 0) {
      const chunks: Array<{ text: string; startTime: number; endTime: number; chunkIndex: number }> = [];

      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const segText = seg.text.trim();
        if (!segText) continue;

        const words = segText.split(/\s+/).length;
        const nextSeg = segments[i + 1];
        const segStartTime = seg.seconds || 0;
        const segEndTime = nextSeg ? nextSeg.seconds : Math.max(segStartTime + 5, segStartTime + words * 0.5);

        chunks.push({
          text: segText,
          startTime: Math.max(0, parseFloat(segStartTime.toFixed(1))),
          endTime: parseFloat(segEndTime.toFixed(1)),
          chunkIndex: chunks.length,
        });
      }

      if (chunks.length > 0) return chunks;
    }

    // Case 2: Paragraph-based or sentence-based chunking with estimated timestamps
    const paragraphs = cleanText.split(/\n+/).filter((p) => p.trim().length > 0);
    const chunks: Array<{ text: string; startTime: number; endTime: number; chunkIndex: number }> = [];
    const totalWords = cleanText.split(/\s+/).length;
    let accumulatedWords = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i].trim();
      const pWords = p.split(/\s+/).length;
      const startFrac = accumulatedWords / Math.max(1, totalWords);
      accumulatedWords += pWords;
      const endFrac = accumulatedWords / Math.max(1, totalWords);

      const startTime = parseFloat((startFrac * duration).toFixed(1));
      const endTime = parseFloat((Math.min(duration, endFrac * duration)).toFixed(1));

      chunks.push({
        text: p,
        startTime,
        endTime: Math.max(startTime + 3, endTime),
        chunkIndex: chunks.length,
      });
    }

    return chunks;
  }

  /**
   * Generate embedding for a single text using Gemini Embedding API
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    if (!text || !text.trim()) {
      throw new Error('Cannot generate embedding for empty text.');
    }

    const ai = this.getClient();
    try {
      const res = await ai.models.embedContent({
        model: GEMINI_EMBEDDING_MODEL,
        contents: text.trim(),
        config: {
          outputDimensionality: EMBEDDING_DIMENSION,
        },
      });

      const values = res.embeddings?.[0]?.values;
      if (!values || values.length === 0) {
        throw new Error('Gemini embedding API returned empty vector output.');
      }
      return values;
    } catch (err: any) {
      console.error('[SemanticSearch] Gemini embedding error:', err.message);
      throw err;
    }
  }

  /**
   * Index a transcript once and persist chunks with vector embeddings.
   * Protects API credits by verifying the content hash first.
   */
  public async indexTranscript(params: ChunkMetadata): Promise<{
    indexedCount: number;
    skipped: boolean;
    hash: string;
  }> {
    const { userId, projectId, assetId, transcriptId, text } = params;
    if (!text || !text.trim()) {
      return { indexedCount: 0, skipped: true, hash: '' };
    }

    const contentHash = this.computeHash(text);
    const existingHash = db.getTranscriptIndexHash(userId, transcriptId || projectId || 'default');

    if (existingHash === contentHash) {
      const existingChunks = db.getContentChunks(userId, projectId);
      if (existingChunks.length > 0) {
        return { indexedCount: existingChunks.length, skipped: true, hash: contentHash };
      }
    }

    // Split into chunks
    const chunks = this.chunkTranscript(params);
    if (chunks.length === 0) {
      return { indexedCount: 0, skipped: true, hash: contentHash };
    }

    console.log(`[SemanticSearch] Indexing ${chunks.length} chunks for transcript (userId: ${userId}, projectId: ${projectId})`);

    const dbChunks: DBContentChunk[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const ch = chunks[i];
      try {
        const embedding = await this.generateEmbedding(ch.text);
        const chunkId = `chunk_${Date.now()}_${i}_${crypto.randomBytes(3).toString('hex')}`;
        dbChunks.push({
          id: chunkId,
          userId,
          projectId,
          assetId,
          transcriptId,
          text: ch.text,
          startTime: ch.startTime,
          endTime: ch.endTime,
          chunkIndex: ch.chunkIndex,
          contentHash,
          embedding,
          createdAt: new Date().toISOString(),
        });
      } catch (embedErr: any) {
        console.warn(`[SemanticSearch] Failed to embed chunk ${i}:`, embedErr.message);
      }
    }

    if (dbChunks.length > 0) {
      // Remove old chunks for this transcript/project if updating
      db.deleteContentChunks(userId, projectId, transcriptId);
      // Save new chunks
      db.saveContentChunks(userId, dbChunks);
      // Record index hash
      db.setTranscriptIndexHash(userId, transcriptId || projectId || 'default', contentHash);
    }

    return { indexedCount: dbChunks.length, skipped: false, hash: contentHash };
  }

  /**
   * Search creator transcript chunks using natural language query
   */
  public async semanticSearch(options: {
    userId: string;
    query: string;
    projectId?: string;
    limit?: number;
    matchThreshold?: number;
  }): Promise<SemanticSearchResult[]> {
    const { userId, query, projectId, limit = 5, matchThreshold = 0.4 } = options;
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    // Ensure chunks exist; if none exist, attempt auto-indexing of user's existing transcripts
    let userChunks = db.getContentChunks(userId, projectId);
    if (userChunks.length === 0) {
      const userTranscripts = db.getAllTranscripts(userId);
      for (const t of userTranscripts) {
        if (t.transcript && t.transcript.trim()) {
          const asset = t.assetId ? db.getAssetById(userId, t.assetId) : null;
          await this.indexTranscript({
            userId,
            projectId: t.projectId,
            assetId: t.assetId,
            transcriptId: t.id,
            text: t.transcript,
            segments: t.segments,
            duration: asset?.duration || 30,
          });
        }
      }
      userChunks = db.getContentChunks(userId, projectId);
    }

    if (userChunks.length === 0) {
      return [];
    }

    // Generate query embedding (Single API request protected)
    const queryEmbedding = await this.generateEmbedding(cleanQuery);

    // Compute cosine similarity and rank
    const scored = userChunks
      .map((chunk) => {
        const sim = this.cosineSimilarity(queryEmbedding, chunk.embedding);
        return { chunk, sim };
      })
      .filter((item) => item.sim >= matchThreshold)
      .sort((a, b) => b.sim - a.sim)
      .slice(0, limit);

    return scored.map(({ chunk, sim }) => {
      const project = chunk.projectId ? db.getProjectById(userId, chunk.projectId) : null;
      const asset = chunk.assetId ? db.getAssetById(userId, chunk.assetId) : null;
      const similarityPercentage = Math.round(sim * 100);

      return {
        id: chunk.id,
        projectId: chunk.projectId,
        assetId: chunk.assetId,
        transcriptId: chunk.transcriptId,
        videoTitle: project?.name || asset?.name || 'Video Session',
        thumbnailUrl: asset?.thumbnailUrl || asset?.thumbnail,
        text: chunk.text,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        timeRange: `${this.formatTime(chunk.startTime)} – ${this.formatTime(chunk.endTime)}`,
        similarity: parseFloat(sim.toFixed(4)),
        similarityPercentage,
        scoreLabel: `Semantic match: ${similarityPercentage}%`,
      };
    });
  }
}

export const semanticSearchService = new SemanticSearchService();
