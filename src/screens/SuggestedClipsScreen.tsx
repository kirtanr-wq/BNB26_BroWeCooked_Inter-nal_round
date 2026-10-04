import React, { useState } from 'react';
import { ScreenId, SuggestedClip } from '../types';
import { useProject } from '../context/ProjectContext';

interface SuggestedClipsScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const SuggestedClipsScreen: React.FC<SuggestedClipsScreenProps> = ({ onNavigate }) => {
  const { project, setSelectedClip, setSuggestedClips, token } = useProject();
  const [filter, setFilter] = useState<'all' | 'high'>('all');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const rawClips = project?.suggestedClips;
  const clips: SuggestedClip[] = Array.isArray(rawClips) ? rawClips : [];

  // If clips are empty but a source video exists, trigger AI analysis to extract real clips and frames
  React.useEffect(() => {
    if (clips.length === 0 && project?.sourceVideo?.filename && !isAnalyzing) {
      handleTriggerAnalysis();
    }
  }, [project?.sourceVideo?.filename, clips.length]);

  const handleTriggerAnalysis = async () => {
    if (!project?.sourceVideo?.filename) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filename: project.sourceVideo.filename,
          videoTitle: project.name || 'AI Video Strategy',
          projectId: project.id,
        }),
      });
      if (!res.ok) throw new Error(`AI analysis returned status ${res.status}`);
      const data = await res.json();
      if (data.analysis?.suggestedClips?.length > 0) {
        const generated: SuggestedClip[] = data.analysis.suggestedClips.map((seg: any, idx: number) => ({
          id: seg.id || `clip_${Date.now()}_${idx}`,
          clipNumber: `0${idx + 1}`,
          title: seg.title,
          hook: seg.hook,
          reason: seg.reason,
          timeRange: `${Math.round(seg.start)}s - ${Math.round(seg.end)}s`,
          startTime: seg.start,
          endTime: seg.end,
          duration: `${Math.round(seg.end - seg.start)}s`,
          durationSeconds: Math.round(seg.end - seg.start),
          aiHookScore: seg.aiHookScore || 90,
          viralScore: seg.aiHookScore || 90,
          aspectRatio: ['9:16', '1:1', '16:9'],
          tags: seg.tags || ['Viral', 'Shorts'],
          statusBadge: idx === 0 ? 'Top Pick' : 'High Energy',
          thumbnail: seg.thumbnail || seg.thumbnailUrl || undefined,
          thumbnailUrl: seg.thumbnailUrl || seg.thumbnail || undefined,
          transcriptSnippet: seg.hook,
        }));
        setSuggestedClips(generated);
      }
    } catch (err: any) {
      console.warn('Auto AI analysis error:', err);
      setAnalysisError(err.message || 'Failed to generate clips');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredClips = clips.filter((c) => {
    const score = c.aiHookScore || c.retentionScore || 85;
    if (filter === 'high') return score >= 90;
    return true;
  });

  const handleSelectClip = (clip: SuggestedClip) => {
    setSelectedClip(clip);
    onNavigate('clip_editor');
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-['Inter'] pb-28">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#c7c4d8]/40">
        <div>
          <div className="flex items-center gap-2 text-[#464555] text-xs mb-1">
            <span className="material-symbols-outlined text-[16px]">movie_filter</span>
            <span>Project: {project?.name || 'Studio Campaign'}</span>
            <span>/</span>
            <span className="text-[#4f46e5] font-semibold">AI Suggested Clips</span>
          </div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">
            AI Suggested Clips
          </h1>
          <p className="text-sm text-[#464555] mt-1 max-w-2xl">
            Gemini identified high-impact narrative segments from your video. Select a clip to trim and format.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#f2f3ff] p-1 rounded-lg border border-[#c7c4d8]/60 text-xs font-semibold">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                filter === 'all' ? 'bg-white text-[#4f46e5] shadow-xs' : 'text-[#464555]'
              }`}
            >
              All Clips ({clips.length})
            </button>
            <button
              onClick={() => setFilter('high')}
              className={`px-3 py-1.5 rounded-md cursor-pointer transition-colors ${
                filter === 'high' ? 'bg-white text-[#4f46e5] shadow-xs' : 'text-[#464555]'
              }`}
            >
              Top Scored (90+)
            </button>
          </div>

          <button
            onClick={() => onNavigate('create_project')}
            className="bg-white border border-[#c7c4d8] hover:bg-[#f2f3ff] text-[#131b2e] text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">cloud_upload</span>
            <span>Change Video</span>
          </button>
        </div>
      </div>

      {/* Honest AI Scoring Disclaimer Banner */}
      <div className="bg-[#f2f3ff] border border-[#e2dfff] rounded-xl p-4 flex items-center gap-3 text-xs text-[#464555]">
        <span className="material-symbols-outlined text-[#4f46e5] text-xl shrink-0">info</span>
        <span>
          <strong>AI Estimated Strength:</strong> Scores are algorithmic estimates generated by Gemini analyzing speech pacing, semantic tension, and hook formulation. They are not measured post-publish metrics.
        </span>
      </div>

      {/* Loading or Empty State */}
      {isAnalyzing && (
        <div className="bg-white border border-[#c7c4d8]/70 rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-xs">
          <div className="w-10 h-10 border-3 border-[#4f46e5]/30 border-t-[#4f46e5] rounded-full animate-spin" />
          <div>
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-base text-[#131b2e]">
              Analyzing Video with Gemini AI...
            </h3>
            <p className="text-xs text-[#777587] mt-1 max-w-md mx-auto">
              Scanning speech transcripts, detecting speaker moments, and extracting crystal-clear frame thumbnails for each clip.
            </p>
          </div>
        </div>
      )}

      {!isAnalyzing && clips.length === 0 && (
        <div className="bg-white border border-[#c7c4d8]/70 rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-xs">
          <span className="material-symbols-outlined text-4xl text-[#777587]">video_camera_back</span>
          <div>
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-base text-[#131b2e]">
              No Suggested Clips Yet
            </h3>
            <p className="text-xs text-[#777587] mt-1 max-w-md mx-auto">
              {project?.sourceVideo?.filename
                ? 'Run AI analysis on your uploaded video to automatically extract high-impact viral moments with real video thumbnails.'
                : 'Upload a video to let Gemini AI identify viral moments and create clips.'}
            </p>
          </div>
          {project?.sourceVideo?.filename ? (
            <button
              onClick={handleTriggerAnalysis}
              className="px-5 py-2.5 bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">auto_awesome</span>
              <span>Generate Clips with Gemini</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('create_project')}
              className="px-5 py-2.5 bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">cloud_upload</span>
              <span>Upload Video</span>
            </button>
          )}
        </div>
      )}

      {/* Clips Grid */}
      {clips.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClips.map((clip) => {
            const score = clip.aiHookScore || clip.viralScore || 88;
            const thumbUrl = clip.thumbnailUrl || clip.thumbnail;
            return (
              <div
                key={clip.id}
                className="bg-white border border-[#c7c4d8]/70 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Media Preview Box */}
                  <div className="relative aspect-video w-full bg-slate-900 overflow-hidden flex items-center justify-center">
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={clip.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-full h-full bg-slate-900 flex flex-col items-center justify-center text-slate-400 gap-1.5 ${
                        thumbUrl ? 'hidden' : 'flex'
                      }`}
                    >
                      <span className="material-symbols-outlined text-3xl text-slate-500">movie</span>
                      <span className="text-[11px] font-mono">{clip.title}</span>
                    </div>

                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors pointer-events-none" />

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                        {clip.clipNumber || '01'}
                      </span>
                      <span className="bg-[#4f46e5] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        AI Hook Score: {score}
                      </span>
                    </div>

                    {/* Duration Badge */}
                    <div className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded">
                      {clip.duration || '15s'} ({clip.timeRange || '0s - 15s'})
                    </div>
                  </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#131b2e] line-clamp-1">
                    {clip.title}
                  </h3>

                  {clip.hook && (
                    <p className="text-xs text-[#464555] line-clamp-2 italic bg-[#faf8ff] p-2.5 rounded-lg border border-[#eaedff]">
                      "{clip.hook}"
                    </p>
                  )}

                  {clip.reason && (
                    <p className="text-[11px] text-[#777587] line-clamp-2">
                      <strong className="text-[#131b2e]">Why it works:</strong> {clip.reason}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(clip.tags || ['Shorts']).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#f2f3ff] text-[#4f46e5]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer Action */}
              <div className="p-3.5 bg-[#faf8ff] border-t border-[#eaedff] flex items-center justify-between">
                <span className="text-[11px] text-[#777587] font-mono">
                  Timestamp: {clip.timeRange || '0s - 15s'}
                </span>
                <button
                  onClick={() => handleSelectClip(clip)}
                  className="px-3.5 py-1.5 bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold rounded-lg shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>Edit Clip</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
        );
      })}
        </div>
      )}
    </div>
  );
};
