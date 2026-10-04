import React from 'react';
import { ScreenId } from '../types';
import { useProject } from '../context/ProjectContext';
import TiltedCard from '../components/TiltedCard';

interface DashboardScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNavigate }) => {
  const { user, projects, creatorStats } = useProject();

  const totalProjects = creatorStats?.totalProjects ?? projects.length;
  const totalRawVideos = creatorStats?.totalRawVideos ?? 0;
  const totalClips = creatorStats?.totalClips ?? 0;
  const totalExports = creatorStats?.totalExports ?? 0;

  const tools = [
    {
      id: 'video',
      category: 'Video',
      title: 'Upload & Analyze Video',
      desc: 'Isolate high-impact moments with Gemini',
      footer: 'FFmpeg Audio Sync',
      icon: 'video_library',
      screen: 'create_project' as ScreenId,
    },
    {
      id: 'suggestions',
      category: 'AI Suggestions',
      title: 'Suggested Clips',
      desc: 'Browse candidate clips & hooks',
      footer: 'AI Hook Scoring',
      icon: 'lightbulb',
      screen: 'suggestions' as ScreenId,
    },
    {
      id: 'editor',
      category: 'Studio',
      title: 'Clip Editor & Timeline',
      desc: 'Precision start/end trim with native FFmpeg',
      footer: 'Frame-accurate cuts',
      icon: 'content_cut',
      screen: 'clip_editor' as ScreenId,
    },
    {
      id: 'hooks',
      category: 'Hooks',
      title: 'Generate Hooks',
      desc: 'Create first 3-second opening angles',
      footer: 'Contrarian & Urgency',
      icon: 'flare',
      screen: 'hooks' as ScreenId,
    },
    {
      id: 'captions',
      category: 'Captions',
      title: 'Platform Captions',
      desc: 'Descriptions for LinkedIn, TikTok & X',
      footer: 'Automated Hashtags',
      icon: 'subtitles',
      screen: 'captions' as ScreenId,
    },
    {
      id: 'repurpose',
      category: 'Repurpose',
      title: 'Content Adaptation',
      desc: 'Format to 9:16 vertical, 1:1 and 16:9',
      footer: 'Background Blur Scaler',
      icon: 'auto_fix_high',
      screen: 'adapt' as ScreenId,
    },
    {
      id: 'workflow',
      category: 'Workflow',
      title: 'Pipeline Progression',
      desc: 'Stage-by-stage project tracking',
      footer: 'Real Studio State',
      icon: 'view_kanban',
      screen: 'workflow' as ScreenId,
    },
    {
      id: 'analytics',
      category: 'Analytics',
      title: 'Production Analytics',
      desc: 'Review actual render & output statistics',
      footer: 'Zero-fabrication metrics',
      icon: 'analytics',
      screen: 'analytics' as ScreenId,
    },
  ];

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 font-['Inter'] pb-28">
      {/* Greeting Header Block */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div className="space-y-1.5">
          <h1 className="font-['Plus_Jakarta_Sans'] text-3xl md:text-4xl text-[#131b2e] font-bold tracking-tight">
            Good morning, {user?.username || 'Creator'} 👋
          </h1>
          <p className="text-base text-[#464555] max-w-2xl">
            Transform raw long-form footage into polished multi-channel shorts, hooks, and formatted posts.
          </p>
        </div>

        <button
          onClick={() => onNavigate('create_project')}
          className="bg-[#4f46e5] hover:bg-[#3525cd] text-white px-5 py-3 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <span className="material-symbols-outlined text-lg">add_circle</span>
          <span>New Video Project</span>
        </button>
      </section>

      {/* Real Statistics Metric Tiles (ZERO FABRICATED METRICS) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Projects', value: totalProjects, icon: 'folder', sub: 'Database Registered' },
          { label: 'Source Videos', value: totalRawVideos, icon: 'videocam', sub: 'Footage Uploaded' },
          { label: 'Generated Clips', value: totalClips, icon: 'movie_filter', sub: 'FFmpeg Trimmed' },
          { label: 'Deliverables Exported', value: totalExports, icon: 'file_download', sub: 'Ready for Release' },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-5 bg-white border border-[#c7c4d8]/70 rounded-xl shadow-xs space-y-2"
          >
            <div className="flex items-center justify-between text-[#777587]">
              <span className="text-xs font-semibold uppercase tracking-wider">{stat.label}</span>
              <span className="material-symbols-outlined text-lg text-[#4f46e5]">{stat.icon}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[#131b2e] font-['Plus_Jakarta_Sans']">
              {stat.value}
            </div>
            <p className="text-[11px] text-[#777587] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {stat.sub}
            </p>
          </div>
        ))}
      </section>

      {/* Honest Social Channels Disclaimer Banner */}
      <section className="bg-[#f2f3ff] border border-[#e2dfff] rounded-xl p-4 flex items-center justify-between gap-4 text-xs text-[#464555]">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#4f46e5] text-xl shrink-0">link</span>
          <span>
            <strong>External Platform Metrics:</strong> Social accounts (YouTube, TikTok, LinkedIn) not yet linked via OAuth. Viewership and follower statistics remain unmeasured to ensure data integrity.
          </span>
        </div>
        <button
          onClick={() => onNavigate('analytics')}
          className="text-[#4f46e5] font-semibold hover:underline shrink-0 cursor-pointer"
        >
          View Production Analytics →
        </button>
      </section>

      {/* Core AI Tools Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-[#131b2e] flex items-center gap-2">
            <span>Creative Studio Tools</span>
            <span className="text-[11px] bg-[#e2dfff] text-[#0f0069] font-bold px-2 py-0.5 rounded-full">
              8 Capabilities
            </span>
          </h2>
          <span className="text-xs text-[#464555] hidden sm:inline-block">Select a workflow to begin auto-processing</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tools.map((t) => (
            <TiltedCard
              key={t.id}
              containerHeight="270px"
              containerWidth="100%"
              imageHeight="270px"
              imageWidth="100%"
              rotateAmplitude={12}
              scaleOnHover={1.05}
              showMobileWarning={false}
              showTooltip={false}
              displayOverlayContent={true}
              onClick={() => onNavigate(t.screen)}
              className="cursor-pointer group"
              overlayContent={
                <div className="w-full h-full rounded-2xl bg-white/95 backdrop-blur-sm border border-[#c7c4d8]/70 hover:border-[#4f46e5] shadow-xs hover:shadow-xl transition-all duration-300 p-5 flex flex-col items-center justify-center text-center relative select-none group">
                  {/* Subtle Top-Right Arrow Indicator */}
                  <div className="absolute top-3.5 right-3.5 text-[#777587] group-hover:text-[#4f46e5] group-hover:translate-x-0.5 transition-all">
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </div>

                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-[#f2f3ff] text-[#4f46e5] group-hover:bg-[#4f46e5] group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-xs mb-3 group-hover:scale-110">
                    <span className="material-symbols-outlined text-2xl">{t.icon}</span>
                  </div>

                  {/* Category Badge */}
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#4f46e5] bg-[#eaedff] px-2.5 py-0.5 rounded-full mb-2">
                    {t.category}
                  </span>

                  {/* Title */}
                  <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#131b2e] group-hover:text-[#4f46e5] transition-colors leading-snug">
                    {t.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-[#464555] leading-relaxed mt-1.5 max-w-[220px]">
                    {t.desc}
                  </p>

                  {/* Footer with smart_toy */}
                  <div className="mt-3.5 pt-3 border-t border-[#e2e7ff] w-full flex items-center justify-center gap-1.5 text-xs text-[#777587] font-medium">
                    <span className="material-symbols-outlined text-sm text-[#4f46e5]">smart_toy</span>
                    <span className="truncate">{t.footer}</span>
                  </div>
                </div>
              }
            />
          ))}
        </div>
      </section>

      {/* Real Recent Projects Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-[#131b2e] tracking-tight">
            Recent Projects ({projects.length})
          </h2>
          <button
            onClick={() => onNavigate('create_project')}
            className="text-xs font-semibold text-[#4f46e5] hover:underline cursor-pointer"
          >
            + Create Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="p-8 bg-white border border-[#c7c4d8]/70 rounded-xl text-center space-y-3">
            <span className="material-symbols-outlined text-3xl text-[#777587]">folder_off</span>
            <p className="text-sm font-semibold text-[#131b2e]">No projects created yet</p>
            <p className="text-xs text-[#464555] max-w-sm mx-auto">
              Start by uploading your first long-form video or audio file to begin repurposing.
            </p>
            <button
              onClick={() => onNavigate('create_project')}
              className="px-4 py-2 bg-[#4f46e5] text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer hover:bg-[#3525cd]"
            >
              Start First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {projects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => onNavigate('suggestions')}
                className="bg-white border border-[#c7c4d8]/70 rounded-xl p-5 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f2f3ff] text-[#4f46e5]">
                      {(proj.status || 'ready').toUpperCase()}
                    </span>
                    <span className="text-[11px] text-[#777587] font-mono">{proj.updatedAt || 'Recently'}</span>
                  </div>
                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#131b2e]">
                    {proj.title || 'Untitled Project'}
                  </h3>
                  <p className="text-xs text-[#464555] line-clamp-2">
                    {proj.description || 'CreatorAi campaign pipeline'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#eaedff] flex items-center justify-between text-xs text-[#4f46e5] font-semibold">
                  <span>Open Pipeline</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
