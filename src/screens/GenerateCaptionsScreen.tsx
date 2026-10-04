import React, { useState } from 'react';
import { ScreenId } from '../types';
import { useProject } from '../context/ProjectContext';

interface GenerateCaptionsScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const GenerateCaptionsScreen: React.FC<GenerateCaptionsScreenProps> = ({ onNavigate }) => {
  const { project, selectedClip, token } = useProject();
  const [selectedPlatform, setSelectedPlatform] = useState<'linkedin' | 'tiktok' | 'youtube' | 'x'>('linkedin');
  const [tone, setTone] = useState<string>('authoritative');
  const [captionText, setCaptionText] = useState<string>(
    project.selectedHook?.hookText
      ? `${project.selectedHook.hookText}\n\nMost teams treat social channels like a copy-paste dumping ground. But high-converting distribution requires contextual synthesis tailored to the persona on each platform.`
      : 'Stop copying 16:9 videos straight to TikTok.\n\nTransform your long-form recordings into high-converting clips.'
  );
  const [hashtags, setHashtags] = useState<string[]>(['#CreatorAi', '#VideoProduction', '#ContentRepurposing']);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async (platform = selectedPlatform, activeTone = tone) => {
    setIsGenerating(true);
    setErrorMsg(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/ai/generate-captions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          clipTitle: selectedClip?.title || project?.name || 'CreatorAi Highlight',
          platform,
          tone: activeTone,
          hook: project?.selectedHook?.hookText || selectedClip?.hook || '',
          projectId: project?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to generate captions.');
      }

      setCaptionText(data.caption);
      if (Array.isArray(data.hashtags)) {
        setHashtags(data.hashtags);
      }
    } catch (err: any) {
      console.error('Caption generation error:', err);
      setErrorMsg(err.message || 'Error occurred while generating caption.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    const fullText = `${captionText}\n\n${hashtags.join(' ')}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-['Inter'] pb-28">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#c7c4d8]/40">
        <div>
          <div className="flex items-center gap-2 text-[#464555] text-xs mb-1">
            <span className="material-symbols-outlined text-[16px]">subtitles</span>
            <span>{project.name}</span>
            <span>/</span>
            <span className="text-[#4f46e5] font-semibold">Captions &amp; Copy</span>
          </div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">
            Platform Captions &amp; Copy
          </h1>
          <p className="text-sm text-[#464555] mt-1 max-w-2xl">
            AI-tailored post descriptions and contextual hashtags generated for each distribution platform.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleGenerate(selectedPlatform, tone)}
            disabled={isGenerating}
            className="bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            <span>{isGenerating ? 'Generating...' : 'Regenerate for Platform'}</span>
          </button>
        </div>
      </div>

      {/* Platform Switcher Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { id: 'linkedin', label: 'LinkedIn', icon: 'work', desc: 'Executive storytelling' },
          { id: 'tiktok', label: 'TikTok & Reels', icon: 'smartphone', desc: 'Punchy & fast-paced' },
          { id: 'youtube', label: 'YouTube Shorts', icon: 'smart_display', desc: 'Search optimized' },
          { id: 'x', label: 'X / Twitter', icon: 'forum', desc: 'Concise thread hook' },
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => {
              const nextP = p.id as any;
              setSelectedPlatform(nextP);
              handleGenerate(nextP, tone);
            }}
            className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
              selectedPlatform === p.id
                ? 'border-[#4f46e5] bg-[#faf8ff] shadow-xs'
                : 'border-[#c7c4d8]/70 bg-white hover:border-[#4f46e5]/40'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`material-symbols-outlined text-lg ${selectedPlatform === p.id ? 'text-[#4f46e5]' : 'text-[#777587]'}`}>
                {p.icon}
              </span>
              <strong className="text-xs font-bold text-[#131b2e]">{p.label}</strong>
            </div>
            <p className="text-[11px] text-[#777587]">{p.desc}</p>
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2.5">
          <span className="material-symbols-outlined text-red-500">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Workspace: Caption Box & Preview */}
      <div className="bg-white border border-[#c7c4d8]/70 rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4f46e5] text-lg">edit_note</span>
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#131b2e]">
              Editable Caption Content ({selectedPlatform.toUpperCase()})
            </h3>
          </div>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-[#f2f3ff] hover:bg-[#e2dfff] text-[#4f46e5] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Caption & Tags'}</span>
          </button>
        </div>

        {/* Text Area */}
        <textarea
          rows={7}
          value={captionText}
          onChange={(e) => setCaptionText(e.target.value)}
          className="w-full p-4 bg-[#faf8ff] border border-[#c7c4d8] rounded-xl text-xs sm:text-sm text-[#131b2e] leading-relaxed focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 outline-none resize-none font-sans"
        />

        {/* Hashtags Bar */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-[#131b2e]">Contextual Hashtags:</span>
          <div className="flex flex-wrap gap-2">
            {hashtags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 bg-[#f2f3ff] border border-[#c7c4d8]/60 text-[#4f46e5] text-xs font-medium rounded-lg"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Floating Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#c7c4d8]/80 py-4 px-4 sm:px-8 z-20 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate('hooks')}
            className="px-4 py-2 text-xs font-semibold text-[#464555] hover:text-[#131b2e] rounded-lg transition-colors cursor-pointer"
          >
            Back to Hooks
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('adapt')}
              className="bg-white border border-[#c7c4d8] hover:bg-[#f2f3ff] text-[#131b2e] px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              Adapt Video Formats
            </button>
            <button
              onClick={() => onNavigate('export')}
              className="bg-[#4f46e5] hover:bg-[#3525cd] text-white px-6 py-2.5 rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <span>Proceed to Final Export</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
