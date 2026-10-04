import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = util.promisify(exec);

export interface VideoMetadata {
  duration: number; // in seconds
  width: number;
  height: number;
  fps: number;
  size: number;
  format: string;
  bitrate?: number;
  hasAudio: boolean;
}

export class VideoProcessor {
  /**
   * Extract video metadata using ffprobe
   */
  public async getMetadata(filePath: string): Promise<VideoMetadata> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    try {
      const { stdout } = await execPromise(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`
      );
      const data = JSON.parse(stdout);

      const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
      const audioStream = data.streams?.find((s: any) => s.codec_type === 'audio');

      const format = data.format || {};
      const stream = videoStream || {};

      let fps = 30;
      if (stream.r_frame_rate) {
        const [num, den] = stream.r_frame_rate.split('/');
        if (num && den && parseInt(den, 10) > 0) {
          fps = Math.round(parseInt(num, 10) / parseInt(den, 10));
        }
      }

      let rawDuration = stream.duration;
      if (!rawDuration || rawDuration === 'N/A') rawDuration = format.duration;
      const parsedDuration = parseFloat(rawDuration || '0');
      const duration = isNaN(parsedDuration) ? 0 : Math.round(parsedDuration * 100) / 100;

      const width = parseInt(stream.width || '1920', 10) || 1920;
      const height = parseInt(stream.height || '1080', 10) || 1080;
      const hasAudio = !!audioStream;

      let rawBitrate = stream.bit_rate;
      if (!rawBitrate || rawBitrate === 'N/A') rawBitrate = format.bit_rate;
      const bitrate = parseInt(rawBitrate || '0', 10) || 0;

      return {
        duration,
        width,
        height,
        fps: fps || 30,
        size: parseInt(format.size || '0', 10) || (fs.existsSync(filePath) ? fs.statSync(filePath).size : 0),
        format: format.format_name || 'mp4',
        bitrate,
        hasAudio,
      };
    } catch (err: any) {
      console.error('ffprobe error:', err);
      throw new Error(`Failed to extract video metadata: ${err.message}`);
    }
  }

  /**
   * Intelligently select a representative, non-black, high-contrast frame timestamp.
   * Rejects completely black, washed out, or transition frames.
   */
  public async chooseRepresentativeTimestamp(options: {
    videoPath: string;
    startTime?: number;
    endTime?: number;
    isSource?: boolean;
    duration?: number;
  }): Promise<number> {
    const { videoPath, isSource } = options;
    let duration = options.duration;
    if (!duration || duration <= 0) {
      try {
        const meta = await this.getMetadata(videoPath);
        duration = meta.duration;
      } catch {
        duration = 10;
      }
    }

    const start = Math.max(0, options.startTime ?? 0);
    const end = Math.min(duration, options.endTime ?? duration);
    const rangeDuration = Math.max(0.2, end - start);

    let candidates: number[] = [];

    if (isSource) {
      // Step 2 formula for source videos: min(max(duration * 0.15, 1), duration - 0.5)
      const primary = Math.min(Math.max(duration * 0.15, 1.0), Math.max(0.5, duration - 0.5));
      candidates = [
        primary,
        duration * 0.25,
        duration * 0.40,
        duration * 0.55,
        duration * 0.70,
        Math.max(0.2, duration * 0.10),
        Math.min(duration - 0.3, duration * 0.85),
      ];
    } else {
      // Step 2 formula for suggested clips: start + max(0.5, min(clipDuration * 0.25, clipDuration - 0.2))
      const primary = start + Math.max(0.5, Math.min(rangeDuration * 0.25, Math.max(0.2, rangeDuration - 0.2)));
      candidates = [
        primary,
        start + rangeDuration * 0.35,
        start + rangeDuration * 0.50,
        start + rangeDuration * 0.65,
        start + rangeDuration * 0.20,
        start + rangeDuration * 0.80,
      ];
    }

    // Clamp within valid boundaries and deduplicate
    const clampedCandidates = candidates
      .map((t) => Math.max(start, Math.min(Math.max(start, end - 0.1), t)))
      .filter((v, i, a) => a.findIndex((t) => Math.abs(t - v) < 0.1) === i);

    let bestTimestamp = clampedCandidates[0] ?? start;
    let maxScore = -9999;

    for (const t of clampedCandidates) {
      try {
        const cmd = `ffmpeg -y -ss ${t.toFixed(2)} -i "${videoPath}" -vframes 1 -vf "scale=64:36,format=rgb24" -f rawvideo - 2>/dev/null`;
        const { stdout } = await execPromise(cmd, { encoding: 'buffer', maxBuffer: 1024 * 1024 });
        if (!stdout || stdout.length < 64 * 36 * 3) continue;

        const totalPixels = Math.floor(stdout.length / 3);
        let bSum = 0;
        const lums = new Float32Array(totalPixels);
        for (let i = 0, p = 0; i < totalPixels * 3; i += 3, p++) {
          const lum = 0.299 * stdout[i] + 0.587 * stdout[i + 1] + 0.114 * stdout[i + 2];
          bSum += lum;
          lums[p] = lum;
        }
        const mean = bSum / totalPixels;

        let varSum = 0;
        for (let p = 0; p < totalPixels; p++) {
          const diff = lums[p] - mean;
          varSum += diff * diff;
        }
        const stddev = Math.sqrt(varSum / totalPixels);

        // Step 3: Detect bad frames:
        // - Completely black (mean < 18)
        // - Almost entirely one color / blank / flat transition (stddev < 14)
        // - Washed out / white (mean > 240)
        if (mean < 18 || mean > 240 || stddev < 14) {
          continue;
        }

        // Favor balanced exposure and high contrast / rich scene details (faces, subjects)
        const exposurePenalty = Math.abs(mean - 128) * 0.25;
        const score = stddev - exposurePenalty;

        if (score > maxScore) {
          maxScore = score;
          bestTimestamp = t;
        }
      } catch {
        // Fall back gracefully if a single seek fails
      }
    }

    return bestTimestamp;
  }

  /**
   * Extract a real video frame as a JPEG thumbnail using FFmpeg
   * Matches Step 4: -vf "scale=640:-2,format=yuv420p" and -q:v 2
   */
  public async extractThumbnail(inputPath: string, outputPath: string, timeSec: number = 1): Promise<string> {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Source video not found: ${inputPath}`);
    }

    try {
      const targetTime = Math.max(0, timeSec);
      const cmd = `ffmpeg -y -ss ${targetTime.toFixed(2)} -i "${inputPath}" -vframes 1 -q:v 2 -vf "scale=640:-2,format=yuv420p" "${outputPath}"`;
      await execPromise(cmd);
      return outputPath;
    } catch (err: any) {
      console.warn('FFmpeg thumbnail extraction warning, falling back to frame 0:', err.message);
      // Fallback to the very first frame
      const fallbackCmd = `ffmpeg -y -i "${inputPath}" -vframes 1 -q:v 2 -vf "scale=640:-2,format=yuv420p" "${outputPath}"`;
      await execPromise(fallbackCmd);
      return outputPath;
    }
  }

  /**
   * Deterministically extract a unique thumbnail bound to an explicit asset or clip ID
   */
  public async generateDeterministicThumbnail(options: {
    sourcePath: string;
    id: string;
    type: 'asset' | 'clip' | 'adapt' | 'export';
    timestamp?: number;
    startTime?: number;
    endTime?: number;
    isSource?: boolean;
    duration?: number;
    processedDir: string;
  }): Promise<{ filename: string; filePath: string; url: string; timestamp: number }> {
    let timeSec: number;

    if (typeof options.timestamp === 'number') {
      timeSec = Math.max(0, options.timestamp);
    } else {
      timeSec = await this.chooseRepresentativeTimestamp({
        videoPath: options.sourcePath,
        startTime: options.startTime,
        endTime: options.endTime,
        isSource: options.isSource ?? options.type === 'asset',
        duration: options.duration,
      });
    }

    const cleanId = options.id.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `thumb_${options.type}_${cleanId}.jpg`;
    const filePath = path.join(options.processedDir, filename);

    await this.extractThumbnail(options.sourcePath, filePath, timeSec);
    return {
      filename,
      filePath,
      url: `/api/media/${filename}`,
      timestamp: timeSec,
    };
  }

  /**
   * Trim video section to a real output file
   */
  public async trimVideo(options: {
    inputPath: string;
    outputPath: string;
    startTime: number;
    endTime: number;
  }): Promise<string> {
    if (!fs.existsSync(options.inputPath)) {
      throw new Error(`Source video not found: ${options.inputPath}`);
    }

    const start = Math.max(0, options.startTime);
    const end = options.endTime;
    const duration = end - start;

    if (duration < 0.2) {
      throw new Error(`Trim end time (${end}s) must be at least 0.2s after start time (${start}s)`);
    }

    // Accurate seek and re-encode to ensure keyframe alignment and audio sync
    const cmd = `ffmpeg -y -ss ${start.toFixed(2)} -i "${options.inputPath}" -t ${duration.toFixed(2)} -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 192k -movflags +faststart "${options.outputPath}"`;
    await execPromise(cmd);
    return options.outputPath;
  }

  /**
   * Resize / Adapt video for specific aspect ratios
   * - 9:16 (1080x1920) vertical reel / short
   * - 1:1 (1080x1080) square
   * - 16:9 (1920x1080) landscape
   */
  public async adaptAspect(options: {
    inputPath: string;
    outputPath: string;
    targetAspect: '9:16' | '1:1' | '16:9';
    blurBackground?: boolean;
  }): Promise<string> {
    if (!fs.existsSync(options.inputPath)) {
      throw new Error(`Source video not found: ${options.inputPath}`);
    }

    let cmd = '';

    if (options.targetAspect === '9:16') {
      if (options.blurBackground) {
        // Complex filtergraph with blurred background fill
        const filter = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:5[bg];[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[v]`;
        cmd = `ffmpeg -y -i "${options.inputPath}" -filter_complex "${filter}" -map "[v]" -map 0:a? -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 192k -movflags +faststart "${options.outputPath}"`;
      } else {
        // High quality center-crop to 9:16
        const filter = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`;
        cmd = `ffmpeg -y -i "${options.inputPath}" -vf "${filter}" -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 192k -movflags +faststart "${options.outputPath}"`;
      }
    } else if (options.targetAspect === '1:1') {
      if (options.blurBackground) {
        const filter = `[0:v]scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080,boxblur=20:5[bg];[0:v]scale=1080:1080:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2[v]`;
        cmd = `ffmpeg -y -i "${options.inputPath}" -filter_complex "${filter}" -map "[v]" -map 0:a? -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 192k -movflags +faststart "${options.outputPath}"`;
      } else {
        const filter = `scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080`;
        cmd = `ffmpeg -y -i "${options.inputPath}" -vf "${filter}" -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 192k -movflags +faststart "${options.outputPath}"`;
      }
    } else {
      // 16:9
      const filter = `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2`;
      cmd = `ffmpeg -y -i "${options.inputPath}" -vf "${filter}" -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 192k -movflags +faststart "${options.outputPath}"`;
    }

    await execPromise(cmd);
    return options.outputPath;
  }

  /**
   * Final Export pipeline with optional burned hook/captions
   */
  public async exportFinalVideo(options: {
    inputPath: string;
    outputPath: string;
    targetAspect: '9:16' | '1:1' | '16:9';
    overlayHook?: string;
    startTime?: number;
    endTime?: number;
  }): Promise<string> {
    if (!fs.existsSync(options.inputPath)) {
      throw new Error(`Source video not found: ${options.inputPath}`);
    }

    let trimOpts = '';
    if (options.startTime !== undefined && options.endTime !== undefined) {
      const dur = options.endTime - options.startTime;
      if (dur > 0) {
        trimOpts = `-ss ${options.startTime.toFixed(2)} -t ${dur.toFixed(2)}`;
      }
    }

    let filter = '';
    if (options.targetAspect === '9:16') {
      filter = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920`;
    } else if (options.targetAspect === '1:1') {
      filter = `scale=1080:1080:force_original_aspect_ratio=increase,crop=1080:1080`;
    } else {
      filter = `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2`;
    }

    // Optional text overlay for viral hook during first 3.5 seconds
    if (options.overlayHook && options.overlayHook.trim()) {
      const cleanText = options.overlayHook
        .replace(/\\/g, '')
        .replace(/'/g, '')
        .replace(/"/g, '')
        .replace(/:/g, '\\:')
        .slice(0, 80);
      filter += `,drawtext=text='${cleanText}':fontcolor=white:fontsize=38:box=1:boxcolor=black@0.75:boxborderw=12:x=(w-text_w)/2:y=h-240:enable='between(t,0,3.5)'`;
    }

    const cmd = `ffmpeg -y ${trimOpts} -i "${options.inputPath}" -vf "${filter}" -c:v libx264 -preset fast -crf 21 -c:a aac -b:a 192k -movflags +faststart "${options.outputPath}"`;
    await execPromise(cmd);
    return options.outputPath;
  }

  /**
   * Extract audio as 16kHz MP3 or WAV for Whisper / Gemini transcription
   */
  public async extractAudio(inputPath: string, outputPath: string): Promise<string> {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Source video not found: ${inputPath}`);
    }
    const cmd = `ffmpeg -y -i "${inputPath}" -vn -ar 16000 -ac 1 -b:a 64k "${outputPath}"`;
    await execPromise(cmd);
    return outputPath;
  }

  /**
   * Ensure an uploaded video is 100% browser compatible:
   * H.264 video, AAC audio, yuv420p pixel format, and +faststart flag.
   */
  public async ensureBrowserCompatible(filePath: string): Promise<string> {
    if (!fs.existsSync(filePath)) return filePath;
    try {
      const { stdout } = await execPromise(
        `ffprobe -v quiet -print_format json -show_streams -show_format "${filePath}"`
      );
      const data = JSON.parse(stdout);
      const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');

      const isH264 = videoStream?.codec_name === 'h264';
      const isYUV420P = videoStream?.pix_fmt === 'yuv420p';

      // If already standard H.264 yuv420p, no transcode needed
      if (isH264 && isYUV420P) {
        return filePath;
      }

      // Transcode safely in-place to browser-standard yuv420p MP4
      const tempOut = `${filePath}.normalized.mp4`;
      const cmd = `ffmpeg -y -i "${filePath}" -c:v libx264 -pix_fmt yuv420p -profile:v high -level 4.0 -c:a aac -b:a 192k -movflags +faststart "${tempOut}"`;
      await execPromise(cmd);
      if (fs.existsSync(tempOut) && fs.statSync(tempOut).size > 0) {
        fs.renameSync(tempOut, filePath);
      }
      return filePath;
    } catch (err: any) {
      console.warn('Video compatibility check warning:', err.message);
      return filePath;
    }
  }

  /**
   * Create a clean default studio podcast sample video if none provided
   */
  public async generateSampleVideo(outputPath: string): Promise<string> {
    if (fs.existsSync(outputPath)) return outputPath;
    const cmd = `ffmpeg -y -f lavfi -i "color=c=#0f172a:size=1920x1080:d=15:rate=30" \
      -f lavfi -i "sine=frequency=220:duration=15" \
      -vf "drawbox=x=160:y=160:w=1600:h=760:color=#1e293b@0.8:t=fill,drawbox=x=160:y=160:w=1600:h=760:color=#4f46e5:t=4,drawtext=text='CREATORAI STUDIO':fontsize=54:fontcolor=#4f46e5:x=220:y=240,drawtext=text='Episode 14 - Autonomous Content Repurposing':fontsize=36:fontcolor=white:x=220:y=330,drawtext=text='Discussing 9\\\\:16 vertical adaptation, retention models, and viral hooks':fontsize=28:fontcolor=#94a3b8:x=220:y=400,drawbox=x=220:y=500:w=1480:h=4:color=#334155:t=fill,drawtext=text='Host\\\\: Alex Rivera   •   Guest\\\\: Dr. Elena Vance':fontsize=24:fontcolor=#cbd5e1:x=220:y=540,drawtext=text='LIVE AUDIO MASTER  •  1080p 30fps':fontsize=22:fontcolor=#10b981:x=220:y=600" \
      -c:v libx264 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "${outputPath}"`;
    await execPromise(cmd);
    return outputPath;
  }
}

export const videoProcessor = new VideoProcessor();
