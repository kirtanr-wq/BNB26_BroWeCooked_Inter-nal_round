import React, { useEffect } from 'react';
import { ScreenId } from '../types';
import { useProject } from '../context/ProjectContext';

interface WorkflowScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const WorkflowScreen: React.FC<WorkflowScreenProps> = ({ onNavigate }) => {
  const { project, projects, refreshProjects, selectProject } = useProject();

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const projectName = project?.name || 'Studio Campaign';
  const suggestedClips = Array.isArray(project?.suggestedClips) ? project.suggestedClips : [];
  const generatedClips = Array.isArray(project?.generatedClips) ? project.generatedClips : [];
  const exportedVideos = Array.isArray(project?.exportedVideos) ? project.exportedVideos : [];
  const projectsList = Array.isArray(projects) ? projects : [];

  // Real pipeline stages derived from active project state
  const stages = [
    {
      id: 1,
      title: 'Raw Media Ingestion',
      desc: project?.sourceVideo ? `Source: ${project.sourceVideo.filename}` : 'Upload video to start',
      done: !!project?.sourceVideo,
      screen: 'create_project' as ScreenId,
    },
    {
      id: 2,
      title: 'AI Analysis & Moments',
      desc: suggestedClips.length > 0 ? `${suggestedClips.length} AI moments identified` : 'Awaiting Gemini analysis',
      done: suggestedClips.length > 0,
      screen: 'suggestions' as ScreenId,
    },
    {
      id: 3,
      title: 'Timeline Trimming & Hooks',
      desc: generatedClips.length > 0 ? `${generatedClips.length} clips trimmed` : 'Fine-tune start & end in editor',
      done: generatedClips.length > 0,
      screen: 'clip_editor' as ScreenId,
    },
    {
      id: 4,
      title: 'Platform Adaptation',
      desc: 'Aspect ratios: 9:16 vertical, 1:1 square, 16:9',
      done: generatedClips.length > 0,
      screen: 'adapt' as ScreenId,
    },
    {
      id: 5,
      title: 'Deliverable Export',
      desc: exportedVideos.length > 0 ? `${exportedVideos.length} final exports generated` : 'Render production master MP4',
      done: exportedVideos.length > 0,
      screen: 'export' as ScreenId,
    },
  ];

  const completedStages = stages.filter((s) => s.done).length;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-['Inter'] pb-28">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#c7c4d8]/40">
        <div>
          <div className="flex items-center gap-2 text-[#464555] text-xs mb-1">
            <span className="material-symbols-outlined text-[16px]">view_kanban</span>
            <span>Studio Pipeline</span>
            <span>/</span>
            <span className="text-[#4f46e5] font-semibold">{projectName}</span>
          </div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">
            Content Workflow Pipeline
          </h1>
          <p className="text-sm text-[#464555] mt-1 max-w-2xl">
            Live progression tracking for your active repurposing campaigns. Stages update automatically based on real project data.
          </p>
        </div>

        <button
          onClick={() => onNavigate('create_project')}
          className="bg-[#4f46e5] hover:bg-[#3525cd] text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-2 cursor-pointer transition-all active:scale-98"
        >
          <span className="material-symbols-outlined text-base">add_circle</span>
          <span>New Workflow Project</span>
        </button>
      </div>

      {/* Pipeline Stage Progression Card */}
      <div className="bg-white rounded-xl border border-[#c7c4d8]/70 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4f46e5] text-xl">linear_scale</span>
            <h2 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#131b2e]">
              Active Project Progression
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#464555] bg-[#eaedff] px-3 py-1 rounded-full">
            {completedStages} of {stages.length} Stages Completed
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-[#f2f3ff] rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-[#4f46e5] to-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${(completedStages / stages.length) * 100}%` }}
          />
        </div>

        {/* Stages Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {stages.map((stage) => (
            <div
              key={stage.id}
              onClick={() => onNavigate(stage.screen)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                stage.done
                  ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-400'
                  : 'border-[#c7c4d8]/70 bg-white hover:border-[#4f46e5]'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-[#777587]">
                    0{stage.id}
                  </span>
                  <span
                    className={`material-symbols-outlined text-lg ${
                      stage.done ? 'text-emerald-600' : 'text-[#c7c4d8]'
                    }`}
                  >
                    {stage.done ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </div>
                <h4 className="font-['Plus_Jakarta_Sans'] text-xs font-bold text-[#131b2e]">
                  {stage.title}
                </h4>
                <p className="text-[11px] text-[#464555] line-clamp-2">{stage.desc}</p>
              </div>

              <div className="text-[11px] font-semibold text-[#4f46e5] flex items-center gap-1 pt-2 border-t border-[#eaedff]">
                <span>{stage.done ? 'Review Stage' : 'Open Tool'}</span>
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Projects in Studio */}
      <div className="space-y-4">
        <h2 className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-[#131b2e]">
          Creator Projects ({projectsList.length})
        </h2>

        {projectsList.length === 0 ? (
          <div className="p-8 bg-white border border-[#c7c4d8]/70 rounded-xl text-center space-y-2">
            <p className="text-sm font-semibold text-[#131b2e]">No active projects</p>
            <p className="text-xs text-[#464555]">
              Upload a video to register your first studio pipeline project.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {projectsList.map((p) => (
              <div
                key={p.id}
                onClick={async () => {
                  await selectProject(p.id);
                  onNavigate('suggestions');
                }}
                className="p-5 bg-white border border-[#c7c4d8]/70 rounded-xl hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f2f3ff] text-[#4f46e5]">
                      {p.status === 'processing'
                        ? 'AI PROCESSING'
                        : (p.status || 'READY').toUpperCase()}
                    </span>
                    <span className="text-[#777587] font-mono text-[11px]">
                      {typeof p.updatedAt === 'number'
                        ? new Date(p.updatedAt).toLocaleDateString()
                        : (p.updatedAt || 'Recent')}
                    </span>
                  </div>
                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#131b2e]">
                    {p.title || p.name}
                  </h3>
                  <p className="text-xs text-[#464555] mt-1 line-clamp-2">
                    {p.description || 'Campaign workflow pipeline'}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#eaedff] flex items-center justify-between text-xs text-[#4f46e5] font-semibold">
                  <span>Enter Workflow</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
