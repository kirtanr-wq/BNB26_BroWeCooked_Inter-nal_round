import React from 'react';
import { ScreenId } from '../types';
import { useProject } from '../context/ProjectContext';

interface AnalyticsScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ onNavigate }) => {
  const { creatorStats, realAssets, projects } = useProject();

  const totalProjects = creatorStats?.totalProjects ?? projects.length;
  const totalRawVideos = creatorStats?.totalRawVideos ?? 0;
  const totalClips = creatorStats?.totalClips ?? 0;
  const totalExports = creatorStats?.totalExports ?? 0;
  const totalHooks = creatorStats?.totalHooksGenerated ?? 0;
  const totalCaptions = creatorStats?.totalCaptionsGenerated ?? 0;
  const storageMB = creatorStats?.totalStorageMB ?? 0;
  const videoMinutes = creatorStats?.totalVideoMinutes ?? 0;

  // Real format distribution calculated from actual assets
  const clipsCount = realAssets.filter((a) => a.type === 'clip').length;
  const videosCount = realAssets.filter((a) => a.type === 'video').length;
  const totalCount = clipsCount + videosCount || 1;
  const clipsPercent = Math.round((clipsCount / totalCount) * 100);
  const videosPercent = 100 - clipsPercent;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-['Inter'] pb-28">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#c7c4d8]/40">
        <div>
          <div className="flex items-center gap-2 text-[#464555] text-xs mb-1">
            <span className="material-symbols-outlined text-[16px]">analytics</span>
            <span>Workspace</span>
            <span>/</span>
            <span className="text-[#4f46e5] font-semibold">Production Analytics</span>
          </div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">
            Production &amp; Studio Analytics
          </h1>
          <p className="text-sm text-[#464555] mt-1 max-w-2xl">
            Verifiable metrics calculated from your real creator database records, media assets, and FFmpeg renders.
          </p>
        </div>

        <button
          onClick={() => onNavigate('dashboard')}
          className="bg-white border border-[#c7c4d8] hover:bg-[#f2f3ff] text-[#131b2e] text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">dashboard</span>
          <span>Return to Dashboard</span>
        </button>
      </div>

      {/* Honest Social Channels Disclaimer Banner */}
      <div className="bg-[#f2f3ff] border border-[#e2dfff] rounded-xl p-4 flex items-center gap-3 text-xs text-[#464555]">
        <span className="material-symbols-outlined text-[#4f46e5] text-xl shrink-0">info</span>
        <div>
          <strong className="block text-[#131b2e] mb-0.5">Audience &amp; Viewership Metrics Unavailable</strong>
          <span>
            External social platform accounts (YouTube Studio, TikTok Creator, LinkedIn) are not currently authenticated via OAuth. To uphold zero-fabrication standards, view counts, watch-time, and retention percentages remain unsimulated.
          </span>
        </div>
      </div>

      {/* Production KPIs Grid (Zero Fabricated Metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Projects', value: totalProjects, sub: 'Database Stored', icon: 'folder' },
          { label: 'Footage Uploaded', value: `${totalRawVideos} files`, sub: `${storageMB} MB Cloud Storage`, icon: 'videocam' },
          { label: 'Clips Rendered', value: `${totalClips} clips`, sub: 'FFmpeg Cut & Styled', icon: 'movie_filter' },
          { label: 'Final Deliverables', value: `${totalExports} exports`, sub: 'Ready for Release', icon: 'file_download' },
        ].map((item, idx) => (
          <div key={idx} className="p-5 bg-white border border-[#c7c4d8]/70 rounded-xl shadow-xs space-y-2">
            <div className="flex items-center justify-between text-[#777587]">
              <span className="text-xs font-semibold uppercase">{item.label}</span>
              <span className="material-symbols-outlined text-lg text-[#4f46e5]">{item.icon}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[#131b2e] font-['Plus_Jakarta_Sans']">
              {item.value}
            </div>
            <p className="text-[11px] text-[#777587] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {item.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Second Row: AI & Studio Activity */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: AI Content Generation */}
        <div className="bg-white border border-[#c7c4d8]/70 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#eaedff]">
            <span className="material-symbols-outlined text-[#4f46e5] text-lg">auto_awesome</span>
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#131b2e]">
              AI Generation Activity
            </h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#464555]">Viral Hooks Generated</span>
              <strong className="text-[#131b2e] font-mono text-sm">{totalHooks}</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#464555]">Platform Captions Formatted</span>
              <strong className="text-[#131b2e] font-mono text-sm">{totalCaptions}</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#464555]">Estimated Video Duration</span>
              <strong className="text-[#131b2e] font-mono text-sm">{videoMinutes} mins</strong>
            </div>
          </div>
        </div>

        {/* Card 2: Asset Ratio Distribution */}
        <div className="bg-white border border-[#c7c4d8]/70 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#eaedff]">
            <span className="material-symbols-outlined text-[#4f46e5] text-lg">pie_chart</span>
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#131b2e]">
              Media Asset Breakdown
            </h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#464555]">Trimmed Vertical Shorts</span>
                <span className="font-bold text-[#131b2e]">{clipsPercent}% ({clipsCount})</span>
              </div>
              <div className="w-full h-2 bg-[#f2f3ff] rounded-full overflow-hidden">
                <div className="h-full bg-[#4f46e5] rounded-full" style={{ width: `${clipsPercent}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[#464555]">Master Source Videos</span>
                <span className="font-bold text-[#131b2e]">{videosPercent}% ({videosCount})</span>
              </div>
              <div className="w-full h-2 bg-[#f2f3ff] rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${videosPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Connected Pipelines */}
        <div className="bg-white border border-[#c7c4d8]/70 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#eaedff]">
            <span className="material-symbols-outlined text-[#4f46e5] text-lg">sync_alt</span>
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#131b2e]">
              Platform Integration Status
            </h3>
          </div>
          <div className="space-y-2.5 text-xs">
            {[
              { name: 'TikTok & Reels', status: 'Export Ready', color: 'text-emerald-600' },
              { name: 'YouTube Shorts', status: 'Export Ready', color: 'text-emerald-600' },
              { name: 'LinkedIn Video', status: 'Export Ready', color: 'text-emerald-600' },
              { name: 'X / Twitter', status: 'Export Ready', color: 'text-emerald-600' },
            ].map((p, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-[#464555]">{p.name}</span>
                <span className={`font-semibold text-[11px] ${p.color}`}>{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
