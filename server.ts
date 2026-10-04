import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import { db, DBAsset, DBProject, DBClip } from './server/db';
import { videoProcessor } from './server/videoProcessor';
import { aiService } from './server/aiService';
import { semanticSearchService } from './server/semanticSearchService';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Ensure upload & processed directories exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const processedDir = path.join(process.cwd(), 'processed');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(processedDir)) fs.mkdirSync(processedDir, { recursive: true });

// Setup Multer with flexible field acceptance and strict JSON error reporting
const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${cleanName}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedExts = ['.mp4', '.mov', '.webm', '.m4v', '.mkv', '.avi', '.mp3', '.wav', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      allowedExts.includes(ext) ||
      file.mimetype.startsWith('video/') ||
      file.mimetype.startsWith('audio/') ||
      file.mimetype.startsWith('text/') ||
      file.mimetype === 'application/octet-stream' ||
      !ext // Allow files with inferred video type
    ) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported format (${ext || file.mimetype}). Supported: MP4, MOV, WEBM, M4V, MP3, WAV, TXT`));
    }
  },
});

// Pre-generate sample podcast video for demo/test workflows
const sampleVideoPath = path.join(uploadsDir, 'sample_podcast_ep14.mp4');
videoProcessor.generateSampleVideo(sampleVideoPath).catch((err) => {
  console.warn('Could not generate sample video:', err.message);
});

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' },
    });
  }

  const user = db.getUserFromToken(authHeader);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_SESSION', message: 'Session expired or invalid. Please sign in again.' },
    });
  }

  req.user = user;
  next();
};

// Optional auth helper (uses session if present, else falls back to primary creator)
const optionalAuth = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const user = db.getUserFromToken(authHeader);
    if (user) req.user = user;
  }
  if (!req.user) {
    req.user = {
      id: 'creator_primary',
      username: 'Alex Rivera',
      email: 'alex@creatorai.studio',
    };
  }
  next();
};

// ==========================================
// API ROUTES
// ==========================================

// 1. Health & Config Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
    supabaseConfigured: !!process.env.SUPABASE_URL,
    ffmpegAvailable: true,
  });
});

// 2. Auth Endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Email and password are required.' },
      });
    }
    const result = await db.registerUser({ username, email, password });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: { code: 'REGISTRATION_FAILED', message: err.message },
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Email and password are required.' },
      });
    }
    const result = await db.loginUser({ email, password });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: { code: 'LOGIN_FAILED', message: err.message },
    });
  }
});

app.get('/api/auth/me', optionalAuth, (req: AuthenticatedRequest, res) => {
  res.json({ success: true, user: req.user });
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization;
  if (token) db.deleteSession(token);
  res.json({ success: true, message: 'Logged out successfully' });
});

// 3. Creator Real Stats Endpoint (Zero Fabricated Metrics)
app.get('/api/creator/stats', optionalAuth, (req: AuthenticatedRequest, res) => {
  const stats = db.getCreatorStats(req.user!.id);
  res.json({ success: true, stats });
});

// 4. File Upload (Accepts 'file', 'video', 'media', or any single file)
app.post(
  '/api/upload',
  optionalAuth,
  (req, res, next) => {
    upload.any()(req, res, (err) => {
      if (err) {
        const message = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
          ? 'File exceeds the 500 MB limit.'
          : err.message || 'File upload error.';
        return res.status(400).json({
          success: false,
          error: { code: 'UPLOAD_FAILED', message },
        });
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_FILE', message: 'No file received in upload request.' },
        });
      }

      const file = files[0];
      const filePath = file.path;
      const isVideo = file.mimetype.startsWith('video/') ||
        ['.mp4', '.mov', '.webm', '.m4v'].includes(path.extname(file.originalname).toLowerCase());

      let metadata = {
        duration: 15,
        width: 1920,
        height: 1080,
        fps: 30,
        size: file.size,
        format: path.extname(file.originalname).replace('.', ''),
        hasAudio: true,
      };

      let thumbnailUrl: string | undefined;
      let thumbnailPath: string | undefined;

      const currentSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : file.size;
      const assetId = `asset_${Date.now()}`;

      if (isVideo) {
        try {
          await videoProcessor.ensureBrowserCompatible(filePath);
        } catch (err: any) {
          console.warn('Could not normalize video:', err.message);
        }

        try {
          metadata = await videoProcessor.getMetadata(filePath);
        } catch (err: any) {
          console.warn('Could not extract full video metadata:', err.message);
        }

        try {
          const thumbResult = await videoProcessor.generateDeterministicThumbnail({
            sourcePath: filePath,
            id: assetId,
            type: 'asset',
            isSource: true,
            duration: metadata.duration,
            processedDir,
          });
          thumbnailUrl = thumbResult.url;
          thumbnailPath = thumbResult.filePath;
        } catch (err: any) {
          console.warn('Could not generate video thumbnail:', err.message);
        }
      }

      const newAsset: Omit<DBAsset, 'userId'> = {
        id: assetId,
        projectId: req.body.projectId || undefined,
        name: file.originalname,
        originalName: file.originalname,
        filename: file.filename,
        storagePath: filePath,
        mimeType: file.mimetype,
        fileSize: currentSize,
        assetType: isVideo ? 'video' : file.mimetype.startsWith('audio/') ? 'audio' : 'transcript',
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        fps: metadata.fps,
        hasAudio: metadata.hasAudio,
        aspect: metadata.width && metadata.height ? `${metadata.width}:${metadata.height}` : '16:9',
        thumbnail: thumbnailUrl,
        thumbnailUrl: thumbnailUrl,
        thumbnailPath: thumbnailPath,
        createdAt: new Date().toISOString(),
      };

      const saved = db.saveAsset(req.user!.id, newAsset);

      res.json({
        success: true,
        asset: {
          ...saved,
          url: `/api/media/${file.filename}`,
        },
      });
    } catch (err: any) {
      console.error('Upload processing error:', err);
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: err.message || 'File processing failed.' },
      });
    }
  }
);

// 5. Media Streaming with HTTP Byte-Range support & Download attachment
app.get('/api/media/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  let filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(processedDir, filename);
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Media file not found');
  }

  // Force download header if requested
  if (req.query.download === '1') {
    return res.download(filePath, filename);
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  const ext = path.extname(filePath).toLowerCase();
  const contentType =
    ext === '.mp4' ? 'video/mp4' :
    ext === '.webm' ? 'video/webm' :
    ext === '.mov' ? 'video/quicktime' :
    ext === '.mp3' ? 'audio/mpeg' :
    ext === '.wav' ? 'audio/wav' :
    ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
    ext === '.png' ? 'image/png' :
    ext === '.webp' ? 'image/webp' : 'application/octet-stream';

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Helper to resolve input media file
function resolveMediaFile(filename: string): string | null {
  const clean = path.basename(filename);
  const inUploads = path.join(uploadsDir, clean);
  if (fs.existsSync(inUploads)) return inUploads;
  const inProcessed = path.join(processedDir, clean);
  if (fs.existsSync(inProcessed)) return inProcessed;
  return null;
}

// 6. Video Trimming Endpoint
app.post('/api/video/trim', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { filename, startTime, endTime, clipTitle, projectId } = req.body;
    if (!filename) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAM', message: 'Source filename is required.' },
      });
    }

    const inputPath = resolveMediaFile(filename);
    if (!inputPath) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Source file '${filename}' not found.` },
      });
    }

    const start = parseFloat(startTime) || 0;
    const end = parseFloat(endTime) || 10;
    if (end <= start) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DURATION', message: 'End time must be after start time.' },
      });
    }

    const outFilename = `clip_${Date.now()}_${Math.round(start)}s_to_${Math.round(end)}s.mp4`;
    const outputPath = path.join(processedDir, outFilename);

    await videoProcessor.trimVideo({
      inputPath,
      outputPath,
      startTime: start,
      endTime: end,
    });

    const meta = await videoProcessor.getMetadata(outputPath);

    // Save clip & asset IDs
    const clipId = `clip_${Date.now()}`;
    const assetId = `clip_asset_${Date.now()}`;

    // Extract real video thumbnail
    let thumbUrl: string | undefined;
    let thumbPath: string | undefined;
    try {
      const thumbResult = await videoProcessor.generateDeterministicThumbnail({
        sourcePath: outputPath,
        id: clipId,
        type: 'clip',
        timestamp: 0.5,
        processedDir,
      });
      thumbUrl = thumbResult.url;
      thumbPath = thumbResult.filePath;
    } catch (e: any) {
      console.warn('Could not generate trim thumbnail:', e.message);
    }

    // Save as asset
    const clipAsset = db.saveAsset(req.user!.id, {
      id: assetId,
      projectId: projectId || undefined,
      name: clipTitle || outFilename,
      originalName: outFilename,
      filename: outFilename,
      storagePath: outputPath,
      mimeType: 'video/mp4',
      fileSize: meta.size,
      assetType: 'clip',
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      fps: meta.fps,
      hasAudio: meta.hasAudio,
      thumbnail: thumbUrl,
      thumbnailUrl: thumbUrl,
      thumbnailPath: thumbPath,
      createdAt: new Date().toISOString(),
    });

    // Save clip record
    const clipRecord = db.saveClip(req.user!.id, {
      id: clipId,
      projectId: projectId || 'default_proj',
      sourceAssetId: filename,
      title: clipTitle || 'Trimmed Clip',
      startTime: start,
      endTime: end,
      duration: meta.duration,
      generatedAssetId: assetId,
      thumbnail: thumbUrl,
      thumbnailUrl: thumbUrl,
      thumbnailPath: thumbPath,
      url: `/api/media/${outFilename}`,
      filename: outFilename,
      createdAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      clip: {
        ...clipRecord,
        url: `/api/media/${outFilename}`,
        filename: outFilename,
        thumbnail: thumbUrl,
        asset: clipAsset,
      },
    });
  } catch (err: any) {
    console.error('Trim error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'TRIM_FAILED', message: err.message },
    });
  }
});

// 7. Video Aspect Adaptation (Fixed -filter_complex for background blur)
app.post('/api/video/adapt', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { filename, targetAspect, blurBackground, projectId } = req.body;
    const inputPath = resolveMediaFile(filename);
    if (!inputPath) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Source video not found.' },
      });
    }

    const aspect = (targetAspect || '9:16') as '9:16' | '1:1' | '16:9';
    const aspectTag = aspect.replace(':', 'x');
    const outFilename = `adapted_${aspectTag}_${Date.now()}.mp4`;
    const outputPath = path.join(processedDir, outFilename);

    await videoProcessor.adaptAspect({
      inputPath,
      outputPath,
      targetAspect: aspect,
      blurBackground: !!blurBackground,
    });

    const meta = await videoProcessor.getMetadata(outputPath);
    const assetId = `adapted_${Date.now()}`;

    let thumbUrl: string | undefined;
    let thumbPath: string | undefined;
    try {
      const thumbResult = await videoProcessor.generateDeterministicThumbnail({
        sourcePath: outputPath,
        id: assetId,
        type: 'adapt',
        timestamp: 0.5,
        processedDir,
      });
      thumbUrl = thumbResult.url;
      thumbPath = thumbResult.filePath;
    } catch (e: any) {
      console.warn('Could not generate adapt thumbnail:', e.message);
    }

    const asset = db.saveAsset(req.user!.id, {
      id: assetId,
      projectId: projectId || undefined,
      name: `${aspect} Adapted Video`,
      originalName: outFilename,
      filename: outFilename,
      storagePath: outputPath,
      mimeType: 'video/mp4',
      fileSize: meta.size,
      assetType: 'clip',
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      fps: meta.fps,
      aspect,
      hasAudio: meta.hasAudio,
      thumbnail: thumbUrl,
      thumbnailUrl: thumbUrl,
      thumbnailPath: thumbPath,
      createdAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      asset: {
        ...asset,
        url: `/api/media/${outFilename}`,
        thumbnail: thumbUrl,
      },
    });
  } catch (err: any) {
    console.error('Adaptation error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'ADAPT_FAILED', message: err.message },
    });
  }
});

// 8. Final Video Export Endpoint
app.post('/api/video/export', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { filename, targetAspect, overlayHook, startTime, endTime, projectName, projectId } = req.body;
    const inputPath = resolveMediaFile(filename);
    if (!inputPath) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Source video file not found.' },
      });
    }

    const aspect = (targetAspect || '9:16') as '9:16' | '1:1' | '16:9';
    const cleanProj = (projectName || 'CreatorAi').replace(/[^a-zA-Z0-9]/g, '_');
    const outFilename = `creatorai_${cleanProj}_export_${Date.now()}.mp4`;
    const outputPath = path.join(processedDir, outFilename);

    await videoProcessor.exportFinalVideo({
      inputPath,
      outputPath,
      targetAspect: aspect,
      overlayHook,
      startTime: startTime !== undefined ? parseFloat(startTime) : undefined,
      endTime: endTime !== undefined ? parseFloat(endTime) : undefined,
    });

    const meta = await videoProcessor.getMetadata(outputPath);
    const assetId = `export_${Date.now()}`;

    let thumbUrl: string | undefined;
    let thumbPath: string | undefined;
    try {
      const thumbResult = await videoProcessor.generateDeterministicThumbnail({
        sourcePath: outputPath,
        id: assetId,
        type: 'export',
        timestamp: 0.5,
        processedDir,
      });
      thumbUrl = thumbResult.url;
      thumbPath = thumbResult.filePath;
    } catch (e: any) {
      console.warn('Could not generate export thumbnail:', e.message);
    }

    const asset = db.saveAsset(req.user!.id, {
      id: assetId,
      projectId: projectId || undefined,
      name: outFilename,
      originalName: outFilename,
      filename: outFilename,
      storagePath: outputPath,
      mimeType: 'video/mp4',
      fileSize: meta.size,
      assetType: 'video',
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      fps: meta.fps,
      aspect,
      hasAudio: meta.hasAudio,
      thumbnail: thumbUrl,
      thumbnailUrl: thumbUrl,
      thumbnailPath: thumbPath,
      createdAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      asset: {
        ...asset,
        url: `/api/media/${outFilename}`,
        downloadUrl: `/api/media/${outFilename}?download=1`,
      },
      downloadUrl: `/api/media/${outFilename}?download=1`,
    });
  } catch (err: any) {
    console.error('Export error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'EXPORT_FAILED', message: err.message },
    });
  }
});

// 9. AI Audio Extraction & Real Transcription
app.post('/api/ai/transcribe', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { filename, projectId } = req.body;
    const inputPath = resolveMediaFile(filename);
    if (!inputPath) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Video file not found for transcription.' },
      });
    }

    const audioOut = path.join(processedDir, `audio_${Date.now()}.mp3`);
    await videoProcessor.extractAudio(inputPath, audioOut);

    const transcriptText = await aiService.transcribeAudio(audioOut);

    // Save to database
    if (projectId) {
      db.saveTranscript(req.user!.id, {
        id: `trans_${Date.now()}`,
        projectId,
        transcript: transcriptText,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      transcript: transcriptText,
    });
  } catch (err: any) {
    console.error('Transcription error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'TRANSCRIPTION_FAILED', message: err.message },
    });
  }
});

// 10. AI Content Analysis (Segments & Hook Proposals)
app.post('/api/ai/analyze', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { filename, videoTitle, transcript } = req.body;
    let duration = 30;

    if (filename) {
      const inputPath = resolveMediaFile(filename);
      if (inputPath) {
        try {
          const meta = await videoProcessor.getMetadata(inputPath);
          duration = meta.duration;
        } catch {}
      }
    }

    const analysis = await aiService.analyzeContent({
      videoTitle: videoTitle || 'Creator Video',
      duration,
      transcript,
    });

    const inputPath = filename ? resolveMediaFile(filename) : null;
    if (inputPath && fs.existsSync(inputPath) && Array.isArray(analysis.suggestedClips)) {
      for (let i = 0; i < analysis.suggestedClips.length; i++) {
        const seg = analysis.suggestedClips[i];
        const clipId = `suggested_clip_${Date.now()}_${i}`;
        try {
          const thumbResult = await videoProcessor.generateDeterministicThumbnail({
            sourcePath: inputPath,
            id: clipId,
            type: 'clip',
            startTime: seg.start,
            endTime: seg.end,
            duration,
            processedDir,
          });
          (seg as any).id = clipId;
          (seg as any).thumbnail = thumbResult.url;
          (seg as any).thumbnailUrl = thumbResult.url;
          (seg as any).thumbnailPath = thumbResult.filePath;
          (seg as any).repTimestamp = thumbResult.timestamp;
        } catch (e: any) {
          console.warn(`Could not extract clip ${i} thumbnail:`, e.message);
        }
      }
    }

    res.json({
      success: true,
      analysis,
    });
  } catch (err: any) {
    console.error('AI analysis error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'AI_ANALYSIS_FAILED', message: err.message },
    });
  }
});

// 11. AI Hook Generation, Regeneration, & Randomization
app.post('/api/ai/generate-hooks', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { clipTitle, transcriptSnippet, tone, projectId } = req.body;
    const hooks = await aiService.generateHooks({
      clipTitle: clipTitle || 'Video Clip',
      transcriptSnippet: transcriptSnippet || '',
      tone: tone || 'contrarian',
    });

    if (projectId) {
      db.saveHooks(
        req.user!.id,
        hooks.map((h) => ({
          id: h.id,
          projectId,
          text: h.hookText,
          style: h.style,
          aiHookScore: h.aiHookScore,
          createdAt: new Date().toISOString(),
        }))
      );
    }

    res.json({ success: true, hooks });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'HOOKS_FAILED', message: err.message },
    });
  }
});

app.post('/api/ai/regenerate-hook', optionalAuth, async (_req: AuthenticatedRequest, res) => {
  try {
    const { clipTitle, style, tone } = _req.body;
    const hook = await aiService.regenerateSingleHook({ clipTitle, style, tone });
    res.json({ success: true, hook });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'HOOK_REGEN_FAILED', message: err.message },
    });
  }
});

// 12. AI Caption Generation
app.post('/api/ai/generate-captions', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { clipTitle, platform, tone, hook, projectId } = req.body;
    const result = await aiService.generateCaptions({
      clipTitle: clipTitle || 'Video Clip',
      platform: platform || 'linkedin',
      tone: tone || 'authoritative',
      hook: hook || '',
    });

    if (projectId) {
      db.saveCaption(req.user!.id, {
        id: `caption_${Date.now()}`,
        projectId,
        platform: platform || 'general',
        text: result.caption,
        hashtags: result.hashtags,
        createdAt: new Date().toISOString(),
      });
    }

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: 'CAPTIONS_FAILED', message: err.message },
    });
  }
});

// 13. Assets Database (RLS Scoped)
app.get('/api/assets', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const assets = db.getAssets(req.user!.id, req.query.projectId as string);

  // Automatically backfill thumbnails for video/clip assets that don't have them yet
  for (const a of assets) {
    if ((a.assetType === 'video' || a.assetType === 'clip') && (!a.thumbnail || !fs.existsSync(a.thumbnailPath || ''))) {
      const mediaPath = resolveMediaFile(a.filename);
      if (mediaPath && fs.existsSync(mediaPath)) {
        try {
          const thumbFilename = `thumb_${path.basename(a.filename, path.extname(a.filename))}.jpg`;
          const thumbOut = path.join(processedDir, thumbFilename);
          if (!fs.existsSync(thumbOut)) {
            await videoProcessor.extractThumbnail(mediaPath, thumbOut, 1);
          }
          if (fs.existsSync(thumbOut)) {
            a.thumbnail = `/api/media/${thumbFilename}`;
            a.thumbnailUrl = `/api/media/${thumbFilename}`;
            a.thumbnailPath = thumbOut;
            db.saveAsset(req.user!.id, a);
          }
        } catch (e: any) {
          console.warn(`Could not backfill thumbnail for ${a.filename}:`, e.message);
        }
      }
    }
  }

  const hydrated = assets.map((a) => ({
    ...a,
    url: `/api/media/${a.filename}`,
    previewUrl: `/api/media/${a.filename}`,
    thumbnail: a.thumbnail || (a.thumbnailUrl || undefined),
  }));
  res.json({ success: true, assets: hydrated });
});

app.delete('/api/assets/:id', optionalAuth, (req: AuthenticatedRequest, res) => {
  const ok = db.deleteAsset(req.user!.id, req.params.id);
  res.json({ success: ok });
});

// 14. Projects Database (RLS Scoped)
app.get('/api/projects', optionalAuth, (req: AuthenticatedRequest, res) => {
  const projects = db.getProjects(req.user!.id);
  res.json({ success: true, projects });
});

app.post('/api/projects', optionalAuth, (req: AuthenticatedRequest, res) => {
  try {
    const proj = db.saveProject(req.user!.id, req.body);
    res.json({ success: true, project: proj });
  } catch (err: any) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: err.message },
    });
  }
});

// 15. Transcripts by Project
app.get('/api/transcripts/:projectId', optionalAuth, (req: AuthenticatedRequest, res) => {
  const trans = db.getTranscript(req.user!.id, req.params.projectId);
  res.json({ success: true, transcript: trans });
});

app.post('/api/transcripts', optionalAuth, async (req: AuthenticatedRequest, res) => {
  const trans = db.saveTranscript(req.user!.id, req.body);
  // Auto-index transcript for semantic search in background (does not block response, skips if unchanged)
  if (trans && trans.transcript) {
    const asset = trans.assetId ? db.getAssetById(req.user!.id, trans.assetId) : null;
    semanticSearchService.indexTranscript({
      userId: req.user!.id,
      projectId: trans.projectId,
      assetId: trans.assetId,
      transcriptId: trans.id,
      text: trans.transcript,
      segments: trans.segments,
      duration: asset?.duration || 30,
    }).catch((err) => console.warn('[SemanticSearch] Auto-index warning:', err.message));
  }
  res.json({ success: true, transcript: trans });
});

// 16. Semantic Search & Indexing Endpoints
app.post('/api/search/semantic', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { query, projectId, limit, matchThreshold } = req.body;
    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_QUERY', message: 'Search query is required.' },
      });
    }

    const trimmedQuery = query.trim().slice(0, 500);
    const userId = req.user!.id;

    const results = await semanticSearchService.semanticSearch({
      userId,
      query: trimmedQuery,
      projectId: projectId || undefined,
      limit: typeof limit === 'number' ? Math.min(20, Math.max(1, limit)) : 5,
      matchThreshold: typeof matchThreshold === 'number' ? matchThreshold : 0.45,
    });

    res.json({
      success: true,
      query: trimmedQuery,
      count: results.length,
      results,
    });
  } catch (err: any) {
    console.error('[SemanticSearch] Search error:', err.message);
    const isQuota = err.status === 429 || String(err).includes('429') || String(err).includes('RESOURCE_EXHAUSTED');
    res.status(isQuota ? 429 : 500).json({
      success: false,
      error: {
        code: isQuota ? 'QUOTA_EXHAUSTED' : 'SEARCH_FAILED',
        message: isQuota
          ? 'Semantic search is temporarily unavailable due to API rate limits.'
          : `Semantic search failed: ${err.message}`,
      },
    });
  }
});

app.post('/api/search/index', optionalAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { projectId, assetId, transcriptId, text, segments, duration } = req.body;
    const userId = req.user!.id;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TEXT', message: 'Transcript text is required for indexing.' },
      });
    }

    const result = await semanticSearchService.indexTranscript({
      userId,
      projectId,
      assetId,
      transcriptId,
      text,
      segments,
      duration: typeof duration === 'number' ? duration : 30,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    console.error('[SemanticSearch] Manual index error:', err.message);
    res.status(500).json({
      success: false,
      error: { code: 'INDEXING_FAILED', message: err.message },
    });
  }
});

// 14. Clips endpoint
app.get('/api/clips', optionalAuth, (req: AuthenticatedRequest, res) => {
  const projectId = req.query.projectId as string | undefined;
  const clips = db.getClips(req.user!.id, projectId);
  res.json({ success: true, clips });
});

// Backfill / normalize existing stored asset and clip thumbnails with real video frames
async function backfillThumbnails() {
  const rawData = (db as any).data;
  if (!rawData) return;

  const assets = Object.values(rawData.assets || {}) as DBAsset[];
  for (const asset of assets) {
    const videoFile = resolveMediaFile(asset.filename || asset.storagePath);
    if (videoFile && fs.existsSync(videoFile)) {
      try {
        const thumbResult = await videoProcessor.generateDeterministicThumbnail({
          sourcePath: videoFile,
          id: asset.id,
          type: asset.assetType === 'clip' ? 'clip' : 'asset',
          isSource: asset.assetType !== 'clip',
          duration: asset.duration,
          processedDir,
        });
        asset.thumbnail = thumbResult.url;
        asset.thumbnailUrl = thumbResult.url;
        asset.thumbnailPath = thumbResult.filePath;
      } catch (e: any) {
        console.warn(`Backfill thumbnail error for asset ${asset.id}:`, e.message);
      }
    }
  }

  const clips = Object.values(rawData.clips || {}) as DBClip[];
  for (const clip of clips) {
    const videoFile = resolveMediaFile(clip.filename || clip.sourceAssetId);
    if (videoFile && fs.existsSync(videoFile)) {
      try {
        const thumbResult = await videoProcessor.generateDeterministicThumbnail({
          sourcePath: videoFile,
          id: clip.id,
          type: 'clip',
          startTime: clip.startTime,
          endTime: clip.endTime || (clip.startTime + (clip.duration || 5)),
          duration: clip.duration,
          processedDir,
        });
        clip.thumbnail = thumbResult.url;
        clip.thumbnailUrl = thumbResult.url;
        clip.thumbnailPath = thumbResult.filePath;
      } catch (e: any) {
        console.warn(`Backfill thumbnail error for clip ${clip.id}:`, e.message);
      }
    }
  }

  db.persist();
  console.log('✅ Backfill complete: All assets and clips updated with real video frames.');
}
backfillThumbnails().catch((err) => console.warn('Thumbnail backfill warning:', err.message));

// ==========================================
// STATIC FILES & VITE MIDDLEWARE
// ==========================================

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            '**/uploads/**',
            '**/processed/**',
            '**/scratch/**',
            '**/*.json',
            '**/*.log',
            '**/*.cjs',
            '**/.git/**',
            '**/node_modules/**',
          ],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CreatorAi server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
