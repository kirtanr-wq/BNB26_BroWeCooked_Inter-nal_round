import React, { useState, useEffect } from 'react';
import { ScreenId } from '../types';
import { useProject } from '../context/ProjectContext';

interface AdaptContentScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const AdaptContentScreen: React.FC<AdaptContentScreenProps> = ({ onNavigate }) => {
  const { project, setTargetPlatform, setSelectedCaption, user } = useProject();
  const [selectedPlatform, setLocalPlatform] = useState<'instagram' | 'shorts' | 'linkedin' | 'x' | 'tiktok'>(
    project.targetPlatform || 'instagram'
  );
  const [ctaEnabled, setCtaEnabled] = useState(true);
  const [captionText, setCaptionText] = useState(
    project.selectedCaption ||
    `AI isn't replacing programmers overnight — but it is changing how the best ones work. 💻⚡\n\nIf you're still writing boilerplate code manually, you're giving away hours of high-leverage thinking time every single day. Here's our workflow breakdown.\n\nDrop your thoughts below 👇\n\n#AI #Programming #WebDev #TechCreators`
  );
  const [isLiked, setIsLiked] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isAdaptingVideo, setIsAdaptingVideo] = useState(false);
  const [adaptedVideoUrl, setAdaptedVideoUrl] = useState<string | null>(null);

  // Active video source
  const videoSrc = adaptedVideoUrl || (project?.generatedClips || [])[0]?.url || project?.sourceVideo?.url || '/api/media/sample_podcast_ep14.mp4';

  const handlePlatformSelect = async (p: typeof selectedPlatform) => {
    setLocalPlatform(p);
    setTargetPlatform(p);

    const aspect = (p === 'instagram' || p === 'shorts' || p === 'tiktok') ? '9:16' : (p === 'linkedin' ? '1:1' : '16:9');
    const sourceFilename = (project?.generatedClips || [])[0]?.filename || project?.sourceVideo?.filename || 'sample_podcast_ep14.mp4';

    setIsAdaptingVideo(true);
    try {
      const res = await fetch('/api/video/adapt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: sourceFilename,
          targetAspect: aspect,
          blurBackground: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.asset?.url) {
          setAdaptedVideoUrl(data.asset.url);
        }
      }
    } catch (e) {
      console.warn('Adapt video error:', e);
    } finally {
      setIsAdaptingVideo(false);
    }
  };

  const handleShorten = () => {
    const shortened = `AI isn't replacing coders — it's empowering them. 💻⚡\n\nStop writing manual boilerplate. Turn AI into your 24/7 senior mentor.\n\nDrop your thoughts below 👇\n\n#AI #Coding #Dev`;
    setCaptionText(shortened);
    setSelectedCaption(shortened);
  };

  const handleAddEmojis = () => {
    if (!captionText.includes('🚀')) {
      const updated = `${captionText} 🚀🔥💡`;
      setCaptionText(updated);
      setSelectedCaption(updated);
    }
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 font-['Inter']">
      {/* Top Meta Hierarchy */}
      <div className="flex flex-col gap-3">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-xs text-[#464555]">
          <button onClick={() => onNavigate('dashboard')} className="hover:text-[#4f46e5] transition-colors cursor-pointer">
            Projects
          </button>
          <span className="text-[#c7c4d8] font-bold">›</span>
          <button onClick={() => onNavigate('repurpose')} className="hover:text-[#4f46e5] transition-colors cursor-pointer">
            {project.name}
          </button>
          <span className="text-[#c7c4d8] font-bold">›</span>
          <span className="text-[#131b2e] font-semibold">Adapt Content</span>
        </nav>

        {/* Title & Platform Segment Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-['Plus_Jakarta_Sans'] text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">
              Adapt Content
            </h1>
            <p className="text-sm text-[#464555] mt-0.5">
              Review and fine-tune AI-adapted content before scheduling or publishing.
            </p>
          </div>

          {/* Platform Switcher Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-full border border-[#c7c4d8] shadow-xs overflow-x-auto">
            <button
              onClick={() => handlePlatformSelect('instagram')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                selectedPlatform === 'instagram'
                  ? 'bg-[#4f46e5] text-white'
                  : 'text-[#464555] hover:text-[#131b2e] hover:bg-[#f2f3ff]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">photo_camera</span>
              <span>Instagram</span>
              <span className="px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px] font-bold">Reels</span>
            </button>
            <button
              onClick={() => handlePlatformSelect('shorts')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedPlatform === 'shorts'
                  ? 'bg-[#4f46e5] text-white'
                  : 'text-[#464555] hover:text-[#131b2e] hover:bg-[#f2f3ff]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">play_circle</span>
              <span>YouTube Shorts</span>
            </button>
            <button
              onClick={() => handlePlatformSelect('linkedin')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedPlatform === 'linkedin'
                  ? 'bg-[#4f46e5] text-white'
                  : 'text-[#464555] hover:text-[#131b2e] hover:bg-[#f2f3ff]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">work</span>
              <span>LinkedIn</span>
            </button>
            <button
              onClick={() => handlePlatformSelect('x')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedPlatform === 'x'
                  ? 'bg-[#4f46e5] text-white'
                  : 'text-[#464555] hover:text-[#131b2e] hover:bg-[#f2f3ff]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">tag</span>
              <span>X (Twitter)</span>
            </button>
            <button
              onClick={() => handlePlatformSelect('tiktok')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedPlatform === 'tiktok'
                  ? 'bg-[#4f46e5] text-white'
                  : 'text-[#464555] hover:text-[#131b2e] hover:bg-[#f2f3ff]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">music_note</span>
              <span>TikTok</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Social Feed Simulator (Phone Frame) */}
        <section className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[370px] bg-white rounded-3xl border border-[#c7c4d8] shadow-md p-4 flex flex-col gap-3">
            {/* Instagram Header inside phone frame */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#131b2e] tracking-tight capitalize">
                  {selectedPlatform} Feed
                </span>
                <span className="material-symbols-outlined text-[#777587] text-[18px]">expand_more</span>
              </div>
              <div className="flex items-center gap-3 text-[#131b2e]">
                <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                <span className="material-symbols-outlined text-[20px]">send</span>
              </div>
            </div>

            {/* 9:16 Vertical Video Canvas with REAL Video element */}
            <div className="relative w-full aspect-9/16 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-inner group">
              <video
                src={videoSrc}
                controls
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                autoPlay
                muted
                loop
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none"></div>

              {/* Safe-Zone Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-white/90 text-[10px] font-semibold border border-white/10 pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-[#006c49]"></span>
                <span>
                  {isAdaptingVideo ? 'FFmpeg Rendering...' : `${selectedPlatform.toUpperCase()} Safe-Zone: On`}
                </span>
              </div>

              {/* Center Kinetic Subtitle Preview */}
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-center text-center px-2 pointer-events-none">
                <div className="bg-black/60 backdrop-blur-xs px-4 py-2 rounded-xl border border-white/10 shadow-lg">
                  <span className="font-['Plus_Jakarta_Sans'] text-lg md:text-xl font-bold text-yellow-300 drop-shadow-md">
                    {(typeof project.selectedHook === 'string' ? project.selectedHook : project.selectedHook?.hookText) || "You're probably using AI wrong."}
                  </span>
                </div>
              </div>

              {/* Right-Hand Action Rail */}
              <div className="absolute right-3 bottom-14 flex flex-col items-center gap-4 text-white z-10 pointer-events-auto">
                <button
                  onClick={() => setIsLiked(!isLiked)}
                  className="flex flex-col items-center gap-1 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:scale-110 transition-transform">
                    <span
                      className={`material-symbols-outlined text-[24px] ${isLiked ? 'text-red-500' : 'text-white'}`}
                      style={{ fontVariationSettings: isLiked ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      favorite
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold drop-shadow">{isLiked ? '1.2k' : '1.1k'}</span>
                </button>

                <div className="flex flex-col items-center gap-1 cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[22px]">chat_bubble</span>
                  </div>
                  <span className="text-[11px] font-semibold drop-shadow">84</span>
                </div>

                <div className="flex flex-col items-center gap-1 cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[22px]">send</span>
                  </div>
                  <span className="text-[11px] font-semibold drop-shadow">Share</span>
                </div>

                <button
                  onClick={() => setIsBookmarked(!isBookmarked)}
                  className="flex flex-col items-center gap-1 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center hover:scale-110 transition-transform">
                    <span
                      className={`material-symbols-outlined text-[22px] ${isBookmarked ? 'text-yellow-400' : 'text-white'}`}
                      style={{ fontVariationSettings: isBookmarked ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      bookmark
                    </span>
                  </div>
                </button>

                {/* Spinning vinyl audio thumbnail */}
                <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden animate-[spin_8s_linear_infinite] mt-1 shadow-md bg-black flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px] text-white">album</span>
                </div>
              </div>

              {/* Bottom Creator Tag & Sound Info */}
              <div className="absolute left-3 right-16 bottom-3 flex flex-col gap-1.5 text-white z-10 pointer-events-none">
                <div className="flex items-center gap-2">
                  <img
                    src={user?.avatarUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%234f46e5"><circle cx="50" cy="50" r="50"/><circle cx="50" cy="40" r="20" fill="%23ffffff"/><path d="M20,85 C20,65 35,62 50,62 C65,62 80,65 80,85 Z" fill="%23ffffff"/></svg>'}
                    alt="Studio Avatar"
                    className="w-7 h-7 rounded-full border border-white/60 object-cover"
                  />
                  <span className="text-xs font-bold drop-shadow">@{user?.username?.toLowerCase().replace(/\s+/g, '_') || 'creator'}</span>
                  <span className="text-white/60 text-[10px]">• 2h ago</span>
                </div>
                <div className="flex items-center gap-1.5 text-white/90 text-[11px]">
                  <span className="material-symbols-outlined text-[14px]">graphic_eq</span>
                  <span className="truncate">Original Audio - {project.name}</span>
                </div>
              </div>
            </div>

            {/* Below Video Caption Preview */}
            <div className="bg-[#f2f3ff] p-3.5 rounded-xl border border-[#c7c4d8] flex flex-col gap-1.5 text-xs">
              <div>
                <span className="font-semibold text-[#131b2e] mr-1.5">creatorai_studio</span>
                <span className="text-[#464555] leading-snug line-clamp-2">
                  {captionText}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-0.5 text-[#3525cd] font-medium text-[11px]">
                <span>#CreatorAi</span>
                <span>#VideoRepurposing</span>
                <span>#{selectedPlatform}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Adaptation Controls & Parameter Cards */}
        <section className="lg:col-span-7 flex flex-col gap-5">
          {/* Section 1: Caption Text Editor */}
          <div className="bg-white rounded-2xl border border-[#c7c4d8] p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#131b2e]">
                  Feed Caption &amp; Description
                </h3>
                <p className="text-xs text-[#464555] mt-0.5">
                  Platform-tailored copy with automated hook integration and emoji optimization.
                </p>
              </div>
              <span className="text-xs font-mono text-[#777587]">
                {captionText.length} chars
              </span>
            </div>

            <textarea
              rows={5}
              value={captionText}
              onChange={(e) => {
                setCaptionText(e.target.value);
                setSelectedCaption(e.target.value);
              }}
              className="w-full p-3.5 bg-white border border-[#c7c4d8] rounded-xl text-xs text-[#131b2e] leading-relaxed outline-none focus:border-[#4f46e5] focus:ring-4 focus:ring-[#4f46e5]/10 font-mono transition-all resize-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#eaedff]">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShorten}
                  className="px-3 py-1.5 rounded-lg border border-[#c7c4d8] hover:bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] transition-colors cursor-pointer"
                >
                  ⚡ Shorten
                </button>
                <button
                  onClick={handleAddEmojis}
                  className="px-3 py-1.5 rounded-lg border border-[#c7c4d8] hover:bg-[#f2f3ff] text-xs font-semibold text-[#131b2e] transition-colors cursor-pointer"
                >
                  ✨ Add Emojis
                </button>
              </div>
              <button
                onClick={() => onNavigate('captions')}
                className="text-xs font-bold text-[#4f46e5] hover:text-[#3525cd] flex items-center gap-1 cursor-pointer"
              >
                <span>Open Full Caption Studio</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Section 2: Platform Output Details */}
          <div className="bg-white rounded-2xl border border-[#c7c4d8] p-5 shadow-xs flex flex-col gap-4">
            <h3 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#131b2e]">
              Aspect Ratio &amp; Visual Formatting
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Render Dimensions</span>
                  <span className="text-[11px] text-slate-600 font-mono">
                    {selectedPlatform === 'linkedin' ? '1080×1080 (1:1 Square)' : '1080×1920 (9:16 Vertical)'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white">
                  Active
                </span>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Video Processing</span>
                  <span className="text-[11px] text-slate-600">FFmpeg Native Scaler</span>
                </div>
                <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
              </div>
            </div>
          </div>

          {/* Section 3: Bottom Action Buttons */}
          <div className="bg-white rounded-2xl border border-[#c7c4d8] p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => onNavigate('repurpose')}
              className="px-4 py-2.5 rounded-lg border border-[#c7c4d8] hover:bg-[#f2f3ff] text-[#131b2e] text-xs font-semibold cursor-pointer"
            >
              Back to Repurpose Hub
            </button>
            <button
              onClick={() => onNavigate('export')}
              className="px-6 py-2.5 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white font-semibold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Approve &amp; Continue to Export</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
