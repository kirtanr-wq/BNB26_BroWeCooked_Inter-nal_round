import React, { useState } from 'react';
import { ScreenId } from '../types';
import { useProject } from '../context/ProjectContext';

interface RepurposeScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

interface RepurposeFormat {
  id: string;
  name: string;
  type: string;
  icon: string;
  iconBg: string;
  status: 'pending' | 'generated';
  specs: string;
  desc?: string;
  detail?: string;
}

export const RepurposeScreen: React.FC<RepurposeScreenProps> = ({ onNavigate }) => {
  const { project, setTargetPlatform, refreshAssets } = useProject();
  const [formats, setFormats] = useState<RepurposeFormat[]>([
    {
      id: 'youtube',
      name: 'YouTube',
      type: '16:9 Landscape Video',
      icon: 'smart_display',
      iconBg: 'bg-red-50 text-red-600 border-red-100',
      status: 'pending',
      specs: '1080p • Includes intro/outro',
      desc: 'Generates high-definition widescreen video snippet with automated intro graphics and high-clarity voice boosting.',
      detail: '',
    },
    {
      id: 'instagram',
      name: 'Instagram Reel',
      type: '9:16 Vertical Video',
      icon: 'photo_camera',
      iconBg: 'bg-pink-50 text-pink-600 border-pink-100',
      status: 'generated',
      specs: 'Auto-captions • Center-crop safe zone',
      detail: 'reel_export_v1.mp4 ready',
    },
    {
      id: 'shorts',
      name: 'YouTube Short',
      type: '9:16 Vertical Video',
      icon: 'play_circle',
      iconBg: 'bg-red-50 text-red-500 border-red-100',
      status: 'generated',
      specs: 'High-retention pace • Sound-on graphics',
      detail: 'Hook animation: "AI Misconception"',
    },
    {
      id: 'linkedin',
      name: 'LinkedIn Post',
      type: 'Text Post + Attached Video',
      icon: 'article',
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      status: 'generated',
      specs: 'Professional tone • Key takeaway bullets',
      detail: '"90% of students treat AI like a search engine instead of..."',
    },
    {
      id: 'twitter',
      name: 'X / Twitter',
      type: 'Short Post & 4-Tweet Thread',
      icon: 'chat_bubble_outline',
      iconBg: 'bg-[#eaedff] text-[#131b2e] border-[#c7c4d8]',
      status: 'pending',
      specs: 'Hook-first thread • 280-char snippets',
      desc: 'Extracts punchy sentences designed for conversational virality and includes auto-stitched numbered thread layout.',
    },
    {
      id: 'tiktok',
      name: 'TikTok / Snippet',
      type: '9:16 Kinetic Subtitles',
      icon: 'music_video',
      iconBg: 'bg-teal-50 text-teal-600 border-teal-100',
      status: 'pending',
      specs: 'Trending sound ready',
      desc: 'Synchronizes spoken emphasis with kinetic bounce typography and 9:16 vertical face-tracking framing.',
    },
  ]);

  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleGenerateFormat = async (id: string) => {
    setProcessingId(id);
    const aspect = (id === 'instagram' || id === 'shorts' || id === 'tiktok') ? '9:16' : (id === 'linkedin' ? '1:1' : '16:9');

    try {
      const sourceFilename = (project?.generatedClips || [])[0]?.filename || project?.sourceVideo?.filename || 'sample_podcast_ep14.mp4';
      const res = await fetch('/api/video/adapt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: sourceFilename,
          targetAspect: aspect,
        }),
      });

      if (res.ok) {
        await refreshAssets();
      }
    } catch (e) {
      console.warn('Adapt error:', e);
    } finally {
      setProcessingId(null);
      setFormats((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: 'generated', detail: `${f.name} render ready` } : f))
      );
    }
  };

  const handleGenerateAll = async () => {
    for (const f of formats) {
      await handleGenerateFormat(f.id);
    }
  };

  const handlePreviewFormat = (platformId: string) => {
    const map: Record<string, 'instagram' | 'shorts' | 'linkedin' | 'x' | 'tiktok'> = {
      instagram: 'instagram',
      shorts: 'shorts',
      linkedin: 'linkedin',
      twitter: 'x',
      tiktok: 'tiktok',
    };
    setTargetPlatform(map[platformId] || 'instagram');
    onNavigate('adapt');
  };

  const generatedCount = formats.filter((f) => f.status === 'generated').length;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 font-['Inter'] pb-28">
      {/* Breadcrumb & Workflow Tracker */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav className="flex items-center space-x-2 text-xs text-[#464555]">
          <button onClick={() => onNavigate('dashboard')} className="hover:text-[#4f46e5] transition-colors cursor-pointer">
            Projects
          </button>
          <span className="material-symbols-outlined text-[14px] text-[#777587]">chevron_right</span>
          <button onClick={() => onNavigate('workflow')} className="hover:text-[#4f46e5] transition-colors cursor-pointer">
            {project.name}
          </button>
          <span className="material-symbols-outlined text-[14px] text-[#777587]">chevron_right</span>
          <span className="text-[#131b2e] font-semibold">Repurpose Content</span>
        </nav>

        {/* Source Clip Status Pill */}
        <div className="inline-flex items-center gap-2 bg-white border border-[#c7c4d8] px-3 py-1.5 rounded-full shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#4f46e5] animate-pulse"></span>
          <span className="text-xs font-semibold text-[#131b2e]">
            Source: {project.selectedClip?.title || 'Selected Highlight'} ({project.selectedClip?.duration || '46s'})
          </span>
        </div>
      </div>

      {/* Screen Title & Progress Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">
            Repurpose Into Multi-Platform Formats
          </h1>
          <p className="text-sm text-[#464555] mt-1 max-w-2xl">
            Automatically transform this video moment into platform-adapted releases with safe-zone scaling and tailored copy.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateAll}
            className="px-5 py-2.5 bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            <span>Generate All ({formats.length})</span>
          </button>
        </div>
      </div>

      {/* Source Video Preview Bar */}
      <div className="bg-white border border-[#c7c4d8] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-16 h-12 rounded-lg bg-black overflow-hidden flex items-center justify-center flex-shrink-0">
            {project?.sourceVideo?.url ? (
              <video src={project.sourceVideo.url} className="w-full h-full object-cover" muted />
            ) : (
              <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-lg">videocam</span>
              </div>
            )}
          </div>
          <div>
            <span className="text-xs font-bold text-[#131b2e] block">
              {project.selectedClip?.title || 'Selected Video Segment'}
            </span>
            <span className="text-[11px] text-[#777587]">
              Hook: "{project.selectedClip?.hook || 'The autonomous content frontier'}"
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#006c49] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {generatedCount} of {formats.length} Ready
          </span>
          <button
            onClick={() => onNavigate('adapt')}
            className="px-4 py-1.5 bg-[#f2f3ff] hover:bg-[#e2e7ff] text-[#4f46e5] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            View Social Preview
          </button>
        </div>
      </div>

      {/* Grid of Format Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {formats.map((format) => {
          const isGen = format.status === 'generated';
          const isBusy = processingId === format.id;

          return (
            <div
              key={format.id}
              className={`bg-white rounded-xl border p-5 transition-all flex flex-col justify-between ${
                isGen ? 'border-[#c7c4d8] shadow-xs' : 'border-[#c7c4d8]/70 hover:border-[#4f46e5]/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${format.iconBg}`}>
                      <span className="material-symbols-outlined text-[20px]">{format.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-[#131b2e]">
                        {format.name}
                      </h3>
                      <span className="text-[10px] text-[#777587] font-medium block">{format.type}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isGen ? 'bg-emerald-50 text-[#006c49] border border-emerald-200' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isGen ? '✓ Generated' : 'Pending'}
                  </span>
                </div>

                <p className="text-xs text-[#464555] leading-relaxed mb-3">
                  {format.desc || format.specs}
                </p>

                {format.detail && (
                  <div className="bg-[#f2f3ff] p-2.5 rounded-lg border border-[#c7c4d8]/40 text-[11px] text-[#131b2e] font-mono line-clamp-1 mb-3">
                    {format.detail}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#eaedff] flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#777587] font-mono">{format.specs}</span>
                <div className="flex items-center gap-1.5">
                  {isGen ? (
                    <button
                      onClick={() => handlePreviewFormat(format.id)}
                      className="px-3 py-1 bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Preview
                    </button>
                  ) : (
                    <button
                      onClick={() => handleGenerateFormat(format.id)}
                      disabled={isBusy}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      {isBusy ? 'Rendering...' : 'Generate'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="bg-white rounded-xl border border-[#c7c4d8] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <span className="text-xs text-[#464555]">
          Ready to export your multi-channel campaign?
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('clip_editor')}
            className="px-4 py-2 border border-[#c7c4d8] hover:bg-[#f2f3ff] rounded-lg text-xs font-semibold text-[#131b2e] cursor-pointer"
          >
            Back to Editor
          </button>
          <button
            onClick={() => onNavigate('export')}
            className="px-5 py-2 bg-[#4f46e5] hover:bg-[#3525cd] text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
          >
            Proceed to Final Export
          </button>
        </div>
      </div>
    </div>
  );
};
