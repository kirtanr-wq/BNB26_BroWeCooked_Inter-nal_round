import React, { useState, useRef, useEffect } from 'react';
import { ScreenId } from '../types';
import { useProject } from '../context/ProjectContext';

interface ClipEditorScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const ClipEditorScreen: React.FC<ClipEditorScreenProps> = ({ onNavigate }) => {
  const { project, selectedClip, addGeneratedClip, refreshAssets, token } = useProject();

  // Selected media & trim boundaries
  const initialStart = typeof selectedClip?.startTime === 'number' ? selectedClip.startTime : 0;
  const initialEnd = typeof selectedClip?.endTime === 'number' ? selectedClip.endTime : 10;

  const [trimStart, setTrimStart] = useState<number>(initialStart);
  const [trimEnd, setTrimEnd] = useState<number>(initialEnd);
  const [currentTime, setCurrentTime] = useState<number>(initialStart);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeAspect, setActiveAspect] = useState<'9:16' | '1:1' | '16:9'>('9:16');
  const [showHookOverlay, setShowHookOverlay] = useState<boolean>(true);
  const [hookText, setHookText] = useState<string>(
    selectedClip?.hook || project.selectedHook?.hookText || 'Stop copying 16:9 videos straight to TikTok'
  );

  // Real clip trimming state
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Active video source (defaults to source video or trimmed clip)
  const [videoSrc, setVideoSrc] = useState<string>(
    project?.sourceVideo?.url || '/api/media/sample_podcast_ep14.mp4'
  );

  const videoRef = useRef<HTMLVideoElement>(null);

  // Synchronize when selected clip changes
  useEffect(() => {
    if (selectedClip) {
      const s = typeof selectedClip.startTime === 'number' ? selectedClip.startTime : 0;
      const e = typeof selectedClip.endTime === 'number' ? selectedClip.endTime : 10;
      setTrimStart(s);
      setTrimEnd(e);
      setCurrentTime(s);
      if (selectedClip.hook) setHookText(selectedClip.hook);
    }
  }, [selectedClip]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      if (videoRef.current.currentTime < trimStart || videoRef.current.currentTime >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);

    // Enforce trim boundary preview loop
    if (curr >= trimEnd) {
      videoRef.current.currentTime = trimStart;
    }
  };

  const handleSeek = (time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // Real FFmpeg Trim Operation
  const handleCreateActualClip = async () => {
    const filename = project?.sourceVideo?.filename || 'sample_podcast_ep14.mp4';
    setIsGenerating(true);
    setGenerateSuccess(null);
    setGenerateError(null);

    // Validation
    if (trimEnd <= trimStart) {
      setGenerateError('End timestamp must be strictly greater than start timestamp.');
      setIsGenerating(false);
      return;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/video/trim', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filename,
          startTime: trimStart,
          endTime: trimEnd,
          clipTitle: selectedClip?.title || `${project?.name || 'CreatorAi'} Highlight`,
          projectId: project?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Server failed to trim video.');
      }

      const clip = data.clip;

      // Update active video preview to newly trimmed file immediately!
      setVideoSrc(clip.url);
      if (videoRef.current) {
        videoRef.current.src = clip.url;
        videoRef.current.currentTime = 0;
      }

      addGeneratedClip({
        id: clip.id,
        title: clip.title || clip.name,
        url: clip.url,
        filename: clip.filename,
        duration: clip.duration || (trimEnd - trimStart),
        aspect: activeAspect,
      });

      await refreshAssets();

      setGenerateSuccess(`Trim successful! Generated file: ${clip.filename}`);
      setTimeout(() => setGenerateSuccess(null), 5000);
    } catch (err: any) {
      console.error('Clip generation error:', err);
      setGenerateError(err.message || 'Error occurred while trimming video.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Inter']">
      {/* Top Editor Bar */}
      <header className="h-14 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between z-30 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('suggestions')}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span>Clips</span>
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-tight">
              {selectedClip?.title || 'Clip #1: The AI Content Shift'}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              AI Hook Score: {selectedClip?.aiHookScore || 92}
            </span>
          </div>
        </div>

        {/* Aspect Ratio Switcher */}
        <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
          {(['9:16', '1:1', '16:9'] as const).map((aspect) => (
            <button
              key={aspect}
              onClick={() => setActiveAspect(aspect)}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                activeAspect === aspect ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              {aspect}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('hooks')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">flare</span>
            <span>Generate Hooks</span>
          </button>
          <button
            onClick={handleCreateActualClip}
            disabled={isGenerating}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-bold rounded-lg text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Trimming FFmpeg...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">content_cut</span>
                <span>Trim &amp; Save Clip</span>
              </>
            )}
          </button>
          <button
            onClick={() => onNavigate('adapt')}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-bold rounded-lg text-white transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Adapt Formats</span>
            <span className="material-symbols-outlined text-sm">auto_fix_high</span>
          </button>
        </div>
      </header>

      {/* Status Banners */}
      {generateSuccess && (
        <div className="bg-emerald-950/80 border-b border-emerald-800/80 px-4 py-2 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-emerald-400">check_circle</span>
            <span>{generateSuccess}</span>
          </div>
          <span className="text-[10px] text-emerald-400/80">Asset registered in library</span>
        </div>
      )}

      {generateError && (
        <div className="bg-red-950/80 border-b border-red-800/80 px-4 py-2 text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-red-400">error</span>
            <span>{generateError}</span>
          </div>
          <button onClick={() => setGenerateError(null)} className="text-red-400 hover:text-red-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Center: Video Preview Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 relative">
          {/* Framed Video Container */}
          <div
            className={`relative bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center transition-all duration-300 ${
              activeAspect === '9:16'
                ? 'h-[500px] aspect-9/16'
                : activeAspect === '1:1'
                ? 'h-[460px] aspect-square'
                : 'w-[720px] aspect-video'
            }`}
          >
            <video
              ref={videoRef}
              src={videoSrc}
              onTimeUpdate={handleTimeUpdate}
              onClick={togglePlay}
              playsInline
              className="w-full h-full object-cover cursor-pointer"
            />

            {/* Burned-in Viral Hook Overlay Preview */}
            {showHookOverlay && hookText && (
              <div className="absolute bottom-12 left-4 right-4 z-10 pointer-events-none transition-all">
                <div className="bg-black/75 backdrop-blur-xs text-white p-3 rounded-lg border border-white/20 text-center font-bold text-xs sm:text-sm shadow-xl leading-snug">
                  {hookText}
                </div>
              </div>
            )}

            {/* Play Button Overlay */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-indigo-600/80 hover:bg-indigo-600 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer"
              >
                <span className="material-symbols-outlined text-3xl ml-1">play_arrow</span>
              </button>
            )}
          </div>

          {/* Time Controls Bar */}
          <div className="w-full max-w-xl mt-4 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <span className="font-mono text-slate-300">
                {currentTime.toFixed(1)}s / {trimEnd.toFixed(1)}s
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHookOverlay}
                  onChange={(e) => setShowHookOverlay(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <span>Show Hook Overlay</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Timeline Trim & Hook Settings */}
        <div className="w-full lg:w-80 bg-slate-900 border-l border-slate-800 p-5 flex flex-col justify-between space-y-6 overflow-y-auto">
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-indigo-400">tune</span>
                <span>Trim Boundaries</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Adjust precise seconds to cut the video clip with native FFmpeg.
              </p>
            </div>

            {/* Inputs: Start / End */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Start (seconds)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={trimStart}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setTrimStart(val);
                    handleSeek(val);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  End (seconds)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={trimStart + 0.5}
                  value={trimEnd}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || trimStart + 1;
                    setTrimEnd(val);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Calculated Duration:</span>
                <strong className="text-white font-mono">{(trimEnd - trimStart).toFixed(1)}s</strong>
              </div>
              <div className="flex justify-between">
                <span>Audio Track:</span>
                <span className="text-emerald-400 font-semibold">AAC Stereo Calibrated</span>
              </div>
            </div>

            {/* Hook text editor */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Burned Hook Copy
              </label>
              <textarea
                rows={3}
                value={hookText}
                onChange={(e) => setHookText(e.target.value)}
                placeholder="Text overlay displayed during first 3 seconds"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 outline-none resize-none"
              />
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="space-y-2.5 pt-4 border-t border-slate-800">
            <button
              onClick={handleCreateActualClip}
              disabled={isGenerating}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">content_cut</span>
              <span>{isGenerating ? 'Trimming FFmpeg...' : 'Render Trimmed Clip'}</span>
            </button>

            <button
              onClick={() => onNavigate('export')}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Proceed to Export</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
