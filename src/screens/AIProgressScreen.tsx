import React, { useState, useEffect } from 'react';
import { ScreenId, SuggestedClip } from '../types';
import { useProject } from '../context/ProjectContext';

interface AIProgressScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const AIProgressScreen: React.FC<AIProgressScreenProps> = ({ onNavigate }) => {
  const { project, setSuggestedClips, setGeneratedHooks, token } = useProject();
  const [progress, setProgress] = useState(15);
  const [currentStage, setCurrentStage] = useState('Extracting vocal frequencies and speech rhythms...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const runAnalysis = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s hard timeout

      try {
        if (!isMounted) return;
        setProgress(25);
        setCurrentStage('Extracting audio & transcribing via Gemini AI...');

        const filename = project?.sourceVideo?.filename || 'sample_podcast_ep14.mp4';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // 1. Trigger Content Analysis
        const res = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers,
          signal: controller.signal,
          body: JSON.stringify({
            filename,
            videoTitle: project?.name || 'AI Video Strategy',
            projectId: project?.id,
          }),
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `AI analysis failed with HTTP ${res.status}`);
        }

        const data = await res.json();
        const analysis = data.analysis;

        if (!isMounted) return;
        setProgress(70);
        setCurrentStage('Isolating high-impact viral moments & generating hooks...');

        // Transform into SuggestedClip format
        const clips: SuggestedClip[] = (analysis.suggestedClips || []).map((seg: any, idx: number) => ({
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

        setSuggestedClips(clips);

        // 2. Also generate hooks for the top clip
        try {
          const hookRes = await fetch('/api/ai/generate-hooks', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              clipTitle: clips[0]?.title || project.name,
              transcriptSnippet: clips[0]?.hook || '',
              tone: 'contrarian',
              projectId: project.id,
            }),
          });
          if (hookRes.ok) {
            const hookData = await hookRes.json();
            if (hookData.hooks) {
              setGeneratedHooks(hookData.hooks);
            }
          }
        } catch (e) {
          console.warn('Initial hook generation warning:', e);
        }

        if (!isMounted) return;
        setProgress(100);
        setCurrentStage('Complete! Opening suggested clips...');

        setTimeout(() => {
          if (isMounted) {
            onNavigate('suggestions');
          }
        }, 800);
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (!isMounted) return;
        console.error('AI pipeline error:', err);
        const isAbort = err.name === 'AbortError';
        setError(isAbort ? 'AI analysis request timed out. You can retry or proceed directly to your project.' : (err.message || 'AI processing encountered an unexpected issue.'));
      }
    };

    runAnalysis();

    return () => {
      isMounted = false;
    };
  }, [project.name, project.sourceVideo?.filename, project.id, setSuggestedClips, setGeneratedHooks, token, onNavigate]);

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e] flex flex-col items-center justify-center px-4 font-['Inter']">
      <div className="w-full max-w-lg bg-white border border-[#c7c4d8]/70 rounded-2xl p-8 shadow-xl text-center space-y-6">
        {/* Animated Icon */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[#4f46e5]/10 animate-ping" />
          <div className="relative w-16 h-16 rounded-2xl bg-[#4f46e5] text-white flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-3xl animate-spin" style={{ animationDuration: '4s' }}>
              auto_awesome
            </span>
          </div>
        </div>

        <div>
          <h2 className="font-['Plus_Jakarta_Sans'] text-2xl font-bold text-[#131b2e] tracking-tight">
            Gemini AI Processing
          </h2>
          <p className="text-xs text-[#464555] mt-1.5 font-medium">
            {currentStage}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#131b2e]">
            <span>Neural Audio &amp; Video Analysis</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-3 bg-[#eaedff] rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-linear-to-r from-[#4f46e5] to-[#7c3aed] rounded-full transition-all duration-300 shadow-xs"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Dynamic Stage Checklist */}
        <div className="bg-[#faf8ff] rounded-xl p-4 text-left space-y-2.5 border border-[#c7c4d8]/40 text-xs">
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined text-base ${progress >= 25 ? 'text-[#006c49]' : 'text-[#777587]'}`}>
              {progress >= 25 ? 'check_circle' : 'radio_button_unchecked'}
            </span>
            <span className={progress >= 25 ? 'font-semibold text-[#131b2e]' : 'text-[#777587]'}>
              Audio dialogue transcription &amp; pacing
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined text-base ${progress >= 70 ? 'text-[#006c49]' : 'text-[#777587]'}`}>
              {progress >= 70 ? 'check_circle' : 'radio_button_unchecked'}
            </span>
            <span className={progress >= 70 ? 'font-semibold text-[#131b2e]' : 'text-[#777587]'}>
              Viral hook potential &amp; retention scoring
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined text-base ${progress >= 95 ? 'text-[#006c49]' : 'text-[#777587]'}`}>
              {progress >= 95 ? 'check_circle' : 'radio_button_unchecked'}
            </span>
            <span className={progress >= 95 ? 'font-semibold text-[#131b2e]' : 'text-[#777587]'}>
              Synthesizing multi-format candidate clips
            </span>
          </div>
        </div>

        {/* Error handling */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 space-y-2">
            <p><strong>Error:</strong> {error}</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Retry Analysis
              </button>
              <button
                onClick={() => onNavigate('suggestions')}
                className="px-3 py-1.5 bg-white border border-red-300 text-red-700 rounded text-xs font-semibold cursor-pointer"
              >
                Proceed to Clips
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
