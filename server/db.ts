import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBProject {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: 'draft' | 'processing' | 'ready' | 'exported';
  createdAt: string;
  updatedAt: string;
}

export interface DBAsset {
  id: string;
  projectId?: string;
  userId: string;
  name: string;
  originalName: string;
  filename: string;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  assetType: 'video' | 'clip' | 'audio' | 'transcript' | 'image';
  duration?: number;
  width?: number;
  height?: number;
  fps?: number;
  hasAudio?: boolean;
  aspect?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  thumbnailPath?: string;
  createdAt: string;
}

export interface DBClip {
  id: string;
  projectId: string;
  sourceAssetId: string;
  userId: string;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  generatedAssetId?: string;
  aiHookScore?: number;
  tags?: string[];
  thumbnail?: string;
  thumbnailUrl?: string;
  thumbnailPath?: string;
  url?: string;
  filename?: string;
  createdAt: string;
}

export interface DBTranscript {
  id: string;
  projectId: string;
  assetId?: string;
  userId: string;
  transcript: string;
  segments?: Array<{
    id: string;
    speaker: string;
    time: string;
    seconds: number;
    text: string;
    highlighted?: boolean;
    aiHookScore?: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface DBHook {
  id: string;
  projectId: string;
  clipId?: string;
  userId: string;
  text: string;
  style: string;
  aiHookScore?: number;
  createdAt: string;
}

export interface DBCaption {
  id: string;
  projectId: string;
  clipId?: string;
  userId: string;
  platform: string;
  text: string;
  hashtags: string[];
  createdAt: string;
}

export interface DBContentChunk {
  id: string;
  userId: string;
  projectId?: string;
  assetId?: string;
  transcriptId?: string;
  text: string;
  startTime: number;
  endTime: number;
  chunkIndex: number;
  contentHash?: string;
  embedding: number[];
  createdAt: string;
}

interface DatabaseSchema {
  users: Record<string, UserProfile>;
  sessions: Record<string, { userId: string; expiresAt: number }>;
  projects: Record<string, DBProject>;
  assets: Record<string, DBAsset>;
  clips: Record<string, DBClip>;
  transcripts: Record<string, DBTranscript>;
  hooks: Record<string, DBHook>;
  captions: Record<string, DBCaption>;
  contentChunks: Record<string, DBContentChunk>;
  transcriptIndexHashes: Record<string, string>;
}

export class DatabaseService {
  private dbFilePath: string;
  private supabase: SupabaseClient | null = null;
  private data: DatabaseSchema;

  constructor() {
    const dataDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbFilePath = path.join(dataDir, 'creatorai_database.json');
    this.data = this.loadDatabase();

    // Check if Supabase credentials are provided
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        console.log('Connected to Supabase client successfully');
      } catch (err: any) {
        console.warn('Failed to initialize Supabase client:', err.message);
      }
    }

    // Seed default demo creator if empty
    this.seedDefaultUserIfEmpty();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          users: parsed.users || {},
          sessions: parsed.sessions || {},
          projects: parsed.projects || {},
          assets: parsed.assets || {},
          clips: parsed.clips || {},
          transcripts: parsed.transcripts || {},
          hooks: parsed.hooks || {},
          captions: parsed.captions || {},
          contentChunks: parsed.contentChunks || {},
          transcriptIndexHashes: parsed.transcriptIndexHashes || {},
        };
      }
    } catch (err: any) {
      console.warn('Could not read existing database, initializing new structure:', err.message);
    }
    return {
      users: {},
      sessions: {},
      projects: {},
      assets: {},
      clips: {},
      transcripts: {},
      hooks: {},
      captions: {},
      contentChunks: {},
      transcriptIndexHashes: {},
    };
  }

  public persist() {
    try {
      fs.writeFileSync(this.dbFilePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('Database write error:', err);
    }
  }

  private seedDefaultUserIfEmpty() {
    if (Object.keys(this.data.users).length === 0) {
      const defaultUserId = 'creator_primary';
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync('creator123', salt);
      this.data.users[defaultUserId] = {
        id: defaultUserId,
        username: 'Alex Rivera',
        email: 'alex@creatorai.studio',
        passwordHash: hash,
        avatarUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%234f46e5"><circle cx="50" cy="50" r="50"/><circle cx="50" cy="40" r="20" fill="%23ffffff"/><path d="M20,85 C20,65 35,62 50,62 C65,62 80,65 80,85 Z" fill="%23ffffff"/></svg>',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.persist();
    }
  }

  // ==========================================
  // AUTHENTICATION & PROFILES
  // ==========================================

  public async registerUser(params: {
    username: string;
    email: string;
    password: string;
  }): Promise<{ user: Omit<UserProfile, 'passwordHash'>; token: string }> {
    const existing = Object.values(this.data.users).find(
      (u) => u.email.toLowerCase() === params.email.toLowerCase()
    );
    if (existing) {
      throw new Error('An account with this email already exists.');
    }

    const userId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(params.password, salt);

    const newUser: UserProfile = {
      id: userId,
      username: params.username.trim() || 'Creator',
      email: params.email.toLowerCase().trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.users[userId] = newUser;
    const token = this.createSession(userId);
    this.persist();

    const { passwordHash: _, ...safeUser } = newUser;
    return { user: safeUser, token };
  }

  public async loginUser(params: {
    email: string;
    password: string;
  }): Promise<{ user: Omit<UserProfile, 'passwordHash'>; token: string }> {
    const user = Object.values(this.data.users).find(
      (u) => u.email.toLowerCase() === params.email.toLowerCase().trim()
    );
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    const isValid = bcrypt.compareSync(params.password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password.');
    }

    const token = this.createSession(user.id);
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  public createSession(userId: string): string {
    const token = `sess_${crypto.randomBytes(24).toString('hex')}`;
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    this.data.sessions[token] = { userId, expiresAt };
    this.persist();
    return token;
  }

  public getUserFromToken(token: string): Omit<UserProfile, 'passwordHash'> | null {
    if (!token) return null;
    const cleanToken = token.replace('Bearer ', '').trim();
    const session = this.data.sessions[cleanToken];
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      delete this.data.sessions[cleanToken];
      this.persist();
      return null;
    }
    const user = this.data.users[session.userId];
    if (!user) return null;
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  public deleteSession(token: string) {
    const cleanToken = token.replace('Bearer ', '').trim();
    if (this.data.sessions[cleanToken]) {
      delete this.data.sessions[cleanToken];
      this.persist();
    }
  }

  // ==========================================
  // PROJECTS (RLS Scoped by userId)
  // ==========================================

  public getProjects(userId: string): DBProject[] {
    return Object.values(this.data.projects)
      .filter((p) => p.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getProjectById(userId: string, projectId: string): DBProject | null {
    const proj = this.data.projects[projectId];
    if (!proj || proj.userId !== userId) return null;
    return proj;
  }

  public saveProject(userId: string, projectData: Partial<DBProject> & { name: string }): DBProject {
    const id = projectData.id || `proj_${Date.now()}`;
    const existing = this.data.projects[id];

    if (existing && existing.userId !== userId) {
      throw new Error('Access denied: Cannot modify another creator\'s project.');
    }

    const project: DBProject = {
      id,
      userId,
      name: projectData.name,
      description: projectData.description || existing?.description || '',
      status: projectData.status || existing?.status || 'draft',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.data.projects[id] = project;
    this.persist();
    return project;
  }

  public deleteProject(userId: string, projectId: string): boolean {
    const proj = this.data.projects[projectId];
    if (!proj || proj.userId !== userId) return false;
    delete this.data.projects[projectId];
    this.persist();
    return true;
  }

  // ==========================================
  // ASSETS (RLS Scoped by userId)
  // ==========================================

  public getAssets(userId: string, projectId?: string): DBAsset[] {
    return Object.values(this.data.assets)
      .filter((a) => a.userId === userId && (!projectId || a.projectId === projectId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getAssetById(userId: string, assetId: string): DBAsset | null {
    const asset = this.data.assets[assetId];
    if (!asset || asset.userId !== userId) return null;
    return asset;
  }

  public saveAsset(userId: string, assetData: Omit<DBAsset, 'userId'>): DBAsset {
    const asset: DBAsset = {
      ...assetData,
      userId,
    };
    this.data.assets[asset.id] = asset;
    this.persist();
    return asset;
  }

  public deleteAsset(userId: string, assetId: string): boolean {
    const asset = this.data.assets[assetId];
    if (!asset || asset.userId !== userId) return false;
    delete this.data.assets[assetId];
    this.persist();
    return true;
  }

  // ==========================================
  // CLIPS (RLS Scoped by userId)
  // ==========================================

  public getClips(userId: string, projectId?: string): DBClip[] {
    return Object.values(this.data.clips)
      .filter((c) => c.userId === userId && (!projectId || c.projectId === projectId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public saveClip(userId: string, clipData: Omit<DBClip, 'userId'>): DBClip {
    const clip: DBClip = {
      ...clipData,
      userId,
    };
    this.data.clips[clip.id] = clip;
    this.persist();
    return clip;
  }

  // ==========================================
  // TRANSCRIPTS
  // ==========================================

  public getTranscript(userId: string, projectId: string): DBTranscript | null {
    const list = Object.values(this.data.transcripts).filter(
      (t) => t.userId === userId && t.projectId === projectId
    );
    return list.length > 0 ? list[0] : null;
  }

  public getAllTranscripts(userId: string): DBTranscript[] {
    return Object.values(this.data.transcripts).filter((t) => t.userId === userId);
  }

  public saveTranscript(userId: string, transcriptData: Omit<DBTranscript, 'userId'>): DBTranscript {
    const transcript: DBTranscript = {
      ...transcriptData,
      userId,
      updatedAt: new Date().toISOString(),
    };
    this.data.transcripts[transcript.id] = transcript;
    this.persist();
    return transcript;
  }

  // ==========================================
  // SEMANTIC CONTENT CHUNKS (pgvector & RLS)
  // ==========================================

  public getContentChunks(userId: string, projectId?: string): DBContentChunk[] {
    return Object.values(this.data.contentChunks || {}).filter(
      (c) => c.userId === userId && (!projectId || c.projectId === projectId)
    );
  }

  public saveContentChunks(userId: string, chunks: DBContentChunk[]): void {
    if (!this.data.contentChunks) this.data.contentChunks = {};
    for (const chunk of chunks) {
      this.data.contentChunks[chunk.id] = { ...chunk, userId };
    }
    this.persist();
  }

  public deleteContentChunks(userId: string, projectId?: string, transcriptId?: string): void {
    if (!this.data.contentChunks) return;
    for (const [id, chunk] of Object.entries(this.data.contentChunks)) {
      if (
        chunk.userId === userId &&
        ((projectId && chunk.projectId === projectId) ||
          (transcriptId && chunk.transcriptId === transcriptId))
      ) {
        delete this.data.contentChunks[id];
      }
    }
    this.persist();
  }

  public getTranscriptIndexHash(userId: string, key: string): string | null {
    if (!this.data.transcriptIndexHashes) this.data.transcriptIndexHashes = {};
    return this.data.transcriptIndexHashes[`${userId}_${key}`] || null;
  }

  public setTranscriptIndexHash(userId: string, key: string, hash: string): void {
    if (!this.data.transcriptIndexHashes) this.data.transcriptIndexHashes = {};
    this.data.transcriptIndexHashes[`${userId}_${key}`] = hash;
    this.persist();
  }

  // ==========================================
  // HOOKS & CAPTIONS
  // ==========================================

  public getHooks(userId: string, projectId: string): DBHook[] {
    return Object.values(this.data.hooks).filter(
      (h) => h.userId === userId && h.projectId === projectId
    );
  }

  public saveHooks(userId: string, hooks: Omit<DBHook, 'userId'>[]): DBHook[] {
    const saved: DBHook[] = [];
    for (const h of hooks) {
      const hook: DBHook = { ...h, userId };
      this.data.hooks[hook.id] = hook;
      saved.push(hook);
    }
    this.persist();
    return saved;
  }

  public getCaptions(userId: string, projectId: string): DBCaption[] {
    return Object.values(this.data.captions).filter(
      (c) => c.userId === userId && c.projectId === projectId
    );
  }

  public saveCaption(userId: string, captionData: Omit<DBCaption, 'userId'>): DBCaption {
    const caption: DBCaption = { ...captionData, userId };
    this.data.captions[caption.id] = caption;
    this.persist();
    return caption;
  }

  // ==========================================
  // ZERO-FABRICATED REAL STATISTICS (RLS Scoped)
  // ==========================================

  public getCreatorStats(userId: string) {
    const userProjects = Object.values(this.data.projects).filter((p) => p.userId === userId);
    const userAssets = Object.values(this.data.assets).filter((a) => a.userId === userId);
    const userClips = Object.values(this.data.clips).filter((c) => c.userId === userId);
    const userHooks = Object.values(this.data.hooks).filter((h) => h.userId === userId);
    const userCaptions = Object.values(this.data.captions).filter((c) => c.userId === userId);

    const rawVideos = userAssets.filter((a) => a.assetType === 'video');
    const exportedVideos = userAssets.filter((a) => a.filename.includes('export'));
    const totalStorageBytes = userAssets.reduce((sum, a) => sum + (Number(a.fileSize) || 0), 0);
    const totalVideoSeconds = userAssets.reduce((sum, a) => sum + (Number(a.duration) || 0), 0);

    return {
      totalProjects: userProjects.length,
      totalAssets: userAssets.length,
      totalRawVideos: rawVideos.length,
      totalClips: userClips.length,
      totalExports: exportedVideos.length,
      totalHooksGenerated: userHooks.length,
      totalCaptionsGenerated: userCaptions.length,
      totalStorageBytes,
      totalStorageMB: Math.round((totalStorageBytes / (1024 * 1024)) * 10) / 10,
      totalVideoMinutes: Math.round((totalVideoSeconds / 60) * 10) / 10,
    };
  }
}

export const db = new DatabaseService();
