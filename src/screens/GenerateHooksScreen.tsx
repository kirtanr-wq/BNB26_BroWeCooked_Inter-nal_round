import React, { useState } from 'react';
import { ScreenId, GeneratedHook } from '../types';
import { useProject } from '../context/ProjectContext';

interface GenerateHooksScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const GenerateHooksScreen: React.FC<GenerateHooksScreenProps> = ({ onNavigate }) => {
  const { project, selectedClip, setGeneratedHooks, setSelectedHook, token } = useProject();
  const [selectedHookId, setSelectedHookId] = useState<string>('');
  const [activeTone, setActiveTone] = useState<string>('contrarian');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const rawHooks = project?.generatedHooks;
  const hooks: GeneratedHook[] = (Array.isArray(rawHooks) && rawHooks.length > 0)
    ? rawHooks
    : [
        {
          id: 'hook_1',
          style: 'Contrarian Premise',
          hookText: 'Stop copying 16:9 videos straight to TikTok. Here is why the top 1% of creators switched to adaptive framing.',
          aiHookScore: 94,
          characterCount: 112,
        },
        {
          id: 'hook_2',
          style: 'Brutal Truth',
          hookText: 'AI will not replace creators, but creators leveraging autonomous clip repurposing will replace everyone else.',
          aiHookScore: 91,
          characterCount: 116,
        },
        {
          id: 'hook_3',
          style: 'Curiosity Gap',
          hookText: 'We ran 50 vertical video variants through retention models. One subtle 2-second edit doubled completion rates.',
          aiHookScore: 89,
          characterCount: 117,
        },
        {
          id: 'hook_4',
          style: 'Direct Misdirection',
          hookText: 'Most video teams think the thumbnail decides virality. In 2025, your first 1.2 seconds decides everything.',
          aiHookScore: 93,
          characterCount: 110,
        },
      ];

  const handleGenerateHooks = async (tone = activeTone) => {
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/ai/generate-hooks', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          clipTitle: selectedClip?.title || project.name || 'AI Video Strategy',
          transcriptSnippet: selectedClip?.hook || project.transcript || '',
          tone,
          projectId: project.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to generate hooks from Gemini.');
      }

      setGeneratedHooks(data.hooks);
      if (data.hooks[0]) {
        setSelectedHookId(data.hooks[0].id);
        setSelectedHook(data.hooks[0]);
      }
    } catch (err: any) {
      console.error('Hooks error:', err);
      setErrorMsg(err.message || 'Error communicating with AI service.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectHook = (hook: GeneratedHook) => {
    setSelectedHookId(hook.id);
    setSelectedHook(hook);
  };

  const handleSaveAndProceed = () => {
    const chosen = hooks.find((h) => h.id === selectedHookId) || hooks[0];
    if (chosen) setSelectedHook(chosen);
    onNavigate('captions');
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-['Inter'] pb-28">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#c7c4d8]/40">
        <div>
          <div className="flex items-center gap-2 text-[#464555] text-xs mb-1">
            <span className="material-symbols-outlined text-[16px]">flare</span>
            <span>{project.name}</span>
            <span>/</span>
            <span className="text-[#4f46e5] font-semibold">Hook Generation</span>
          </div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">
            AI Hook Generator
          </h1>
          <p className="text-sm text-[#464555] mt-1 max-w-2xl">
            First 3-second opening lines engineered by Gemini to capture immediate audience attention.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleGenerateHooks(activeTone)}
            disabled={isGenerating}
            className="bg-white border border-[#c7c4d8] hover:bg-[#f2f3ff] text-[#131b2e] text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            <span>{isGenerating ? 'Generating...' : 'Regenerate Hooks'}</span>
          </button>

          <button
            onClick={() => {
              const tones = ['contrarian', 'urgent', 'curiosity', 'humorous', 'authoritative'];
              const next = tones[(tones.indexOf(activeTone) + 1) % tones.length];
              setActiveTone(next);
              handleGenerateHooks(next);
            }}
            disabled={isGenerating}
            className="bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <span className="material-symbols-outlined text-base">shuffle</span>
            <span>Randomize Angle</span>
          </button>
        </div>
      </div>

      {/* Tone Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[#464555] font-semibold mr-1">Tone:</span>
        {[
          { id: 'contrarian', label: 'Contrarian' },
          { id: 'urgent', label: 'Urgent & Direct' },
          { id: 'curiosity', label: 'Curiosity Gap' },
          { id: 'authoritative', label: 'Authoritative' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTone(t.id);
              handleGenerateHooks(t.id);
            }}
            className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-all ${
              activeTone === t.id
                ? 'bg-[#4f46e5] text-white shadow-xs'
                : 'bg-[#f2f3ff] text-[#464555] hover:bg-[#eaedff]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-500">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Honest AI Scoring Disclaimer Banner */}
      <div className="bg-[#f2f3ff] border border-[#e2dfff] rounded-xl p-3.5 flex items-center gap-3 text-xs text-[#464555]">
        <span className="material-symbols-outlined text-[#4f46e5] text-base shrink-0">info</span>
        <span>
          <strong>AI Hook Score:</strong> Denotes structural linguistic impact estimated by Gemini. Not an actual retention or follower metric.
        </span>
      </div>

      {/* Hooks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {hooks.map((hook) => {
          const isSelected = selectedHookId === hook.id;
          const score = hook.aiHookScore || hook.score || 90;
          return (
            <div
              key={hook.id}
              onClick={() => handleSelectHook(hook)}
              className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'border-[#4f46e5] bg-white shadow-md'
                  : 'border-[#c7c4d8]/70 bg-white hover:border-[#4f46e5]/50 hover:shadow-xs'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#f2f3ff] text-[#4f46e5] border border-[#e2dfff]">
                    {hook.style || 'Viral Hook'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#777587] font-semibold">AI Estimated Strength:</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {score}/100
                    </span>
                  </div>
                </div>

                <p className="text-sm font-medium text-[#131b2e] leading-relaxed">
                  "{hook.hookText}"
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#eaedff] text-xs text-[#777587]">
                <span>{hook.characterCount || hook.hookText?.length || 100} characters</span>
                <span className={`font-semibold ${isSelected ? 'text-[#4f46e5]' : 'text-[#777587]'}`}>
                  {isSelected ? '✓ Selected' : 'Click to select'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Floating Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#c7c4d8]/80 py-4 px-4 sm:px-8 z-20 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate('clip_editor')}
            className="px-4 py-2 text-xs font-semibold text-[#464555] hover:text-[#131b2e] rounded-lg transition-colors cursor-pointer"
          >
            Back to Editor
          </button>

          <button
            onClick={handleSaveAndProceed}
            className="bg-[#4f46e5] hover:bg-[#3525cd] text-white px-6 py-2.5 rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <span>Generate Captions with Selected Hook</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
