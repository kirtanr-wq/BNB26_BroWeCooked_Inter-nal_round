import React, { useState, useRef, useEffect } from 'react';
import { ScreenId } from '../types';
import { useProject } from '../context/ProjectContext';

interface ClipEditorScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

const RATIO_OPTIONS = [
  {
    id: '9:16' as const,
    label: '9:16',
    name: 'Vertical',
    platform: 'TikTok / Shorts / Reels',
    icon: 'smartphone',
    badge: 'Shorts & Reels',
  },
  {
    id: '1:1' as const,
    label: '1:1',
    name: 'Square',
    platform: 'LinkedIn / X Feed',
    icon: 'crop_square',
    badge: 'Social Feed',
  },
  {
    id: '16:9' as const,
    label: '16:9',
    name: 'Landscape',
    platform: 'YouTube / Widescreen',
    icon: 'desktop_windows',
    badge: 'YouTube Master',
  },
];

export const ClipEditorScreen: React.FC<ClipEditorScreenProps> = ({ onNavigate }) => {
  const { project, selectedClip, addGeneratedClip, refreshAssets, token } = useProject();

  // Total source duration tracker
  const [totalDuration, setTotalDuration] = useState<number>(() => {
    return project?.sourceVideo?.duration && project.sourceVideo.duration > 0
      ? project.sourceVideo.duration
      : 15;
  });

  // Selected media & trim boundaries
  const initialStart = typeof selectedClip?.startTime === 'number' ? selectedClip.startTime : 0;
  const initialEnd = typeof selectedClip?.endTime === 'number'
    ? selectedClip.endTime
    : Math.min(totalDuration, 10);

  const [trimStart, setTrimStart] = useState<number>(initialStart);
  const [trimEnd, setTrimEnd] = useState<number>(initialEnd);
  const [currentTime, setCurrentTime] = useState<number>(initialStart);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeAspect, setActiveAspect] = useState<'9:16' | '1:1' | '16:9'>('9:16');
  const [fitBackgroundStyle, setFitBackgroundStyle] = useState<'blur' | 'dark'>('blur');
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
  const timelineRef = useRef<HTMLDivElement>(null);

  // Synchronize when project source video changes
  useEffect(() => {
    if (project?.sourceVideo?.url) {
      setVideoSrc(project.sourceVideo.url);
    }
    if (project?.sourceVideo?.duration && project.sourceVideo.duration > 0) {
      setTotalDuration(project.sourceVideo.duration);
      if (trimEnd > project.sourceVideo.duration || trimEnd === 0) {
        setTrimEnd(project.sourceVideo.duration);
      }
    }
  }, [project?.sourceVideo?.url, project?.sourceVideo?.duration]);

  // Synchronize when selected clip changes
  useEffect(() => {
    if (selectedClip) {
      const s = typeof selectedClip.startTime === 'number' ? selectedClip.startTime : 0;
      const e = typeof selectedClip.endTime === 'number' ? selectedClip.endTime : Math.min(totalDuration, 10);
      setTrimStart(s);
      setTrimEnd(e);
      setCurrentTime(s);
      if (selectedClip.hook) setHookText(selectedClip.hook);
      if (videoRef.current) {
        videoRef.current.currentTime = s;
      }
    }
  }, [selectedClip, totalDuration]);

  // Metadata loaded event on video element
  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration && !isNaN(videoRef.current.duration)) {
      const dur = Math.round(videoRef.current.duration * 10) / 10;
      setTotalDuration(dur);
      if (trimEnd > dur || trimEnd === 10 || trimEnd === 0) {
        setTrimEnd(dur);
      }
    }
  };

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
    const clamped = Math.max(0, Math.min(totalDuration, time));
    videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  // Timeline scrubber click
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || totalDuration <= 0) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = Math.round(ratio * totalDuration * 10) / 10;
    handleSeek(targetTime);
  };

  // Set In / Out point shortcuts
  const setInPoint = () => {
    const newStart = Math.min(currentTime, Math.max(0, trimEnd - 0.5));
    setTrimStart(newStart);
  };

  const setOutPoint = () => {
    const newEnd = Math.max(currentTime, Math.min(totalDuration, trimStart + 0.5));
    setTrimEnd(newEnd);
  };

  // Presets
  const applyPreset = (type: 'full' | '15s' | '30s' | '60s') => {
    if (type === 'full') {
      setTrimStart(0);
      setTrimEnd(totalDuration);
      handleSeek(0);
    } else if (type === '15s') {
      setTrimStart(0);
      setTrimEnd(Math.min(totalDuration, 15));
      handleSeek(0);
    } else if (type === '30s') {
      setTrimStart(0);
      setTrimEnd(Math.min(totalDuration, 30));
      handleSeek(0);
    } else if (type === '60s') {
      setTrimStart(0);
      setTrimEnd(Math.min(totalDuration, 60));
      handleSeek(0);
    }
  };

  // Real FFmpeg Trim Operation
  const handleCreateActualClip = async () => {
    const filename = project?.sourceVideo?.filename || 'sample_podcast_ep14.mp4';
    const assetId = (project?.sourceVideo as any)?.id || project?.id;
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
          assetId,
          startTime: trimStart,
          endTime: trimEnd,
          clipTitle: selectedClip?.title || `${project?.name || 'CreatorAi'} Clip`,
          projectId: project?.id,
          targetAspect: activeAspect,
          blurBackground: fitBackgroundStyle === 'blur',
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

      setGenerateSuccess(`Trim successful! Generated ${activeAspect} clip: ${clip.filename}`);
      setTimeout(() => setGenerateSuccess(null), 8000);
    } catch (err: any) {
      console.error('Clip generation error:', err);
      setGenerateError(err.message || 'Error occurred while trimming video.');
    } finally {
      setIsGenerating(false);
    }
  };

  const calculatedDuration = Math.max(0, trimEnd - trimStart);
  const startPercent = totalDuration > 0 ? (trimStart / totalDuration) * 100 : 0;
  const endPercent = totalDuration > 0 ? (trimEnd / totalDuration) * 100 : 100;
  const currentPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

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
            <span className="text-xs font-bold text-white tracking-tight truncate max-w-[200px] sm:max-w-xs">
              {selectedClip?.title || 'Clip Trimmer Studio'}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
              AI Hook Score: {selectedClip?.aiHookScore || 92}
            </span>
          </div>
        </div>

        {/* Aspect Ratio Selector (Matching Project Tab) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-800/90 p-0.5 rounded-lg border border-slate-700/60 text-xs">
            {RATIO_OPTIONS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveAspect(item.id)}
                className={`px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeAspect === item.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={item.platform}
              >
                <span className="material-symbols-outlined text-sm">{item.icon}</span>
                <span>{item.label}</span>
                <span className="text-[10px] opacity-75 hidden md:inline">({item.name})</span>
              </button>
            ))}
          </div>

          {/* Background Ambient Fit Switcher */}
          <div className="hidden lg:flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-[11px]">
            <button
              onClick={() => setFitBackgroundStyle('blur')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                fitBackgroundStyle === 'blur'
                  ? 'bg-slate-700 text-indigo-400 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Ambient blurred video background"
            >
              Blur Fill
            </button>
            <button
              onClick={() => setFitBackgroundStyle('dark')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                fitBackgroundStyle === 'dark'
                  ? 'bg-slate-700 text-indigo-400 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Clean black studio background"
            >
              Dark Fill
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('hooks')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-indigo-400">flare</span>
            <span className="hidden sm:inline">AI Hooks</span>
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
                <span>Render Trimmed Clip</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Status Banners */}
      {generateSuccess && (
        <div className="bg-emerald-950/80 border-b border-emerald-800/80 px-4 py-2.5 text-xs text-emerald-300 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-emerald-400">check_circle</span>
            <span className="font-semibold">{generateSuccess}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('assets')}
              className="text-emerald-400 hover:text-emerald-200 underline font-semibold cursor-pointer"
            >
              View in Asset Library &rarr;
            </button>
            <button
              onClick={() => setGenerateSuccess(null)}
              className="text-emerald-400/80 hover:text-emerald-200 cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {generateError && (
        <div className="bg-red-950/80 border-b border-red-800/80 px-4 py-2.5 text-xs text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-red-400">error</span>
            <span>{generateError}</span>
          </div>
          <button
            onClick={() => setGenerateError(null)}
            className="text-red-400 hover:text-red-200 font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Center: Video Preview Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-950 relative overflow-y-auto">
          {/* Ratio Platform Header Badge */}
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
            <span className="material-symbols-outlined text-sm text-indigo-400">aspect_ratio</span>
            <span>Ratio Mode:</span>
            <strong className="text-white font-mono">{activeAspect}</strong>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
              {activeAspect === '9:16' ? 'TikTok / Shorts / Reels' : activeAspect === '1:1' ? 'LinkedIn / X Feed' : 'YouTube Landscape'}
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
              <span className="material-symbols-outlined text-xs">verified</span>
              <span>Zero Crop Fit</span>
            </span>
          </div>

          {/* Framed Video Container (Matching Project Tab with Non-Crop Fit & Ambient Blur) */}
          <div
            className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800/90 flex items-center justify-center transition-all duration-300 ${
              activeAspect === '9:16'
                ? 'h-[480px] sm:h-[520px] aspect-9/16'
                : activeAspect === '1:1'
                ? 'h-[420px] sm:h-[460px] aspect-square'
                : 'w-full max-w-[720px] aspect-video'
            }`}
          >
            {/* Ambient Blurred Video Background Layer (Fill) */}
            {fitBackgroundStyle === 'blur' && videoSrc && (
              <video
                src={videoSrc}
                muted
                autoPlay
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-60 scale-125 pointer-events-none"
              />
            )}

            {/* Foreground Main Video (100% full frame, NEVER cropped) */}
            <video
              ref={videoRef}
              src={videoSrc}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onClick={togglePlay}
              playsInline
              className="w-full h-full object-contain relative z-10 cursor-pointer"
            />

            {/* Burned-in Viral Hook Overlay Preview */}
            {showHookOverlay && hookText && (
              <div className="absolute bottom-10 left-4 right-4 z-20 pointer-events-none transition-all">
                <div className="bg-black/80 backdrop-blur-md text-white p-3 rounded-xl border border-white/20 text-center font-bold text-xs sm:text-sm shadow-2xl leading-snug">
                  {hookText}
                </div>
              </div>
            )}

            {/* Play Button Overlay */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-indigo-600/90 hover:bg-indigo-600 text-white flex items-center justify-center shadow-xl transition-transform hover:scale-110 cursor-pointer z-20"
              >
                <span className="material-symbols-outlined text-3xl ml-1">play_arrow</span>
              </button>
            )}
          </div>

          {/* Player Mini Controls Bar */}
          <div className="w-full max-w-2xl mt-4 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer flex items-center gap-1 font-semibold"
              >
                <span className="material-symbols-outlined text-base">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
                <span>{isPlaying ? 'Pause' : 'Play Trim'}</span>
              </button>

              <span className="font-mono text-slate-300 text-xs">
                {currentTime.toFixed(1)}s <span className="text-slate-500">/</span> {totalDuration.toFixed(1)}s
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px]">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={showHookOverlay}
                  onChange={(e) => setShowHookOverlay(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <span>Show Hook Overlay</span>
              </label>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFitBackgroundStyle(fitBackgroundStyle === 'blur' ? 'dark' : 'blur')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 text-[10px] font-semibold cursor-pointer"
                >
                  {fitBackgroundStyle === 'blur' ? 'Blur BG' : 'Dark BG'}
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Visual Timeline Scrubber */}
          <div className="w-full max-w-2xl mt-4 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-indigo-400">timeline</span>
                <span className="font-bold text-white">Timeline Scrubber</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-slate-400">Clip Duration:</span>
                <strong className="text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/60 font-bold">
                  {calculatedDuration.toFixed(1)}s
                </strong>
              </div>
            </div>

            {/* Visual Timeline Track */}
            <div
              ref={timelineRef}
              onClick={handleTimelineClick}
              className="relative w-full h-8 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden cursor-pointer select-none group"
            >
              {/* Trimmed Active Zone */}
              <div
                className="absolute top-0 bottom-0 bg-indigo-600/40 border-l-2 border-r-2 border-indigo-500 transition-all pointer-events-none"
                style={{
                  left: `${startPercent}%`,
                  width: `${Math.max(0, endPercent - startPercent)}%`,
                }}
              />

              {/* Playhead Marker */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-md z-10 pointer-events-none transition-all"
                style={{ left: `${currentPercent}%` }}
              >
                <div className="w-2.5 h-2.5 bg-white rounded-full -ml-[3px] -mt-1 shadow-sm" />
              </div>

              {/* Time tick labels */}
              <div className="absolute inset-0 flex justify-between items-center px-2 pointer-events-none text-[9px] font-mono text-slate-500">
                <span>0.0s</span>
                <span>{(totalDuration / 2).toFixed(1)}s</span>
                <span>{totalDuration.toFixed(1)}s</span>
              </div>
            </div>

            {/* In / Out Quick Buttons & Timeline Navigation */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={setInPoint}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-white rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                  title="Set trim start to current playhead position"
                >
                  <span className="material-symbols-outlined text-xs">first_page</span>
                  <span>Set In ({currentTime.toFixed(1)}s)</span>
                </button>
                <button
                  type="button"
                  onClick={setOutPoint}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-white rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                  title="Set trim end to current playhead position"
                >
                  <span className="material-symbols-outlined text-xs">last_page</span>
                  <span>Set Out ({currentTime.toFixed(1)}s)</span>
                </button>
              </div>

              {/* Preset buttons */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-slate-500 font-semibold mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => applyPreset('full')}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-semibold cursor-pointer"
                >
                  Full
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('15s')}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-semibold cursor-pointer"
                >
                  15s
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('30s')}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-semibold cursor-pointer"
                >
                  30s
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('60s')}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-semibold cursor-pointer"
                >
                  60s
                </button>
              </div>
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
                Adjust precise seconds to cut the video clip with native FFmpeg engine.
              </p>
            </div>

            {/* Inputs: Start / End with Quick Nudges */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Start (seconds)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={Math.max(0, trimEnd - 0.2)}
                  value={trimStart}
                  onChange={(e) => {
                    const val = Math.max(0, parseFloat(e.target.value) || 0);
                    setTrimStart(val);
                    handleSeek(val);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-indigo-500 outline-none"
                />
                <div className="flex gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const n = Math.max(0, trimStart - 0.5);
                      setTrimStart(n);
                      handleSeek(n);
                    }}
                    className="flex-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 rounded cursor-pointer"
                  >
                    -0.5s
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const n = Math.min(trimEnd - 0.2, trimStart + 0.5);
                      setTrimStart(n);
                      handleSeek(n);
                    }}
                    className="flex-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 rounded cursor-pointer"
                  >
                    +0.5s
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  End (seconds)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={trimStart + 0.2}
                  max={totalDuration}
                  value={trimEnd}
                  onChange={(e) => {
                    const val = Math.min(totalDuration, Math.max(trimStart + 0.2, parseFloat(e.target.value) || trimStart + 1));
                    setTrimEnd(val);
                    handleSeek(val);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-indigo-500 outline-none"
                />
                <div className="flex gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const n = Math.max(trimStart + 0.2, trimEnd - 0.5);
                      setTrimEnd(n);
                      handleSeek(n);
                    }}
                    className="flex-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 rounded cursor-pointer"
                  >
                    -0.5s
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const n = Math.min(totalDuration, trimEnd + 0.5);
                      setTrimEnd(n);
                      handleSeek(n);
                    }}
                    className="flex-1 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 rounded cursor-pointer"
                  >
                    +0.5s
                  </button>
                </div>
              </div>
            </div>

            {/* Calculated specs card */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <div className="flex justify-between">
                <span>Calculated Duration:</span>
                <strong className="text-white font-mono">{calculatedDuration.toFixed(1)}s</strong>
              </div>
              <div className="flex justify-between">
                <span>Target Ratio:</span>
                <strong className="text-indigo-400 font-mono">{activeAspect} ({RATIO_OPTIONS.find((r) => r.id === activeAspect)?.name})</strong>
              </div>
              <div className="flex justify-between">
                <span>Aspect Adaptation:</span>
                <span className="text-emerald-400 font-semibold">
                  {fitBackgroundStyle === 'blur' ? 'Blurred Background Fill' : 'Dark Matte Pad'}
                </span>
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
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-base">content_cut</span>
              <span>{isGenerating ? 'Trimming with FFmpeg...' : 'Render Trimmed Clip'}</span>
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
