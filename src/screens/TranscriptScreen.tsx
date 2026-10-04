import React, { useState, useEffect } from 'react';
import { ScreenId } from '../types';
import { useProject } from '../context/ProjectContext';

interface TranscriptScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

interface TranscriptLine {
  id: string;
  speaker: string;
  time: string;
  text: string;
}

export const TranscriptScreen: React.FC<TranscriptScreenProps> = ({ onNavigate }) => {
  const { project, setTranscript, token } = useProject();
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize transcript lines from project or server
  useEffect(() => {
    if (project.transcript && project.transcript.trim()) {
      const parsedLines = project.transcript
        .split('\n\n')
        .filter((block) => block.trim())
        .map((block, idx) => {
          return {
            id: `line_${idx}`,
            speaker: idx % 2 === 0 ? 'Speaker 1' : 'Speaker 2',
            time: `00:${String(idx * 15).padStart(2, '0')}`,
            text: block.trim(),
          };
        });
      setLines(parsedLines);
    }
  }, [project.transcript]);

  // Real Audio Transcription via Server & Gemini
  const handleTranscribeWithAI = async () => {
    setIsTranscribing(true);
    setErrorMsg(null);

    const filename = project?.sourceVideo?.filename || 'sample_podcast_ep14.mp4';
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        headers,
        body: JSON.stringify({ filename, projectId: project?.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Transcription failed.');
      }

      setTranscript(data.transcript);
    } catch (err: any) {
      console.error('Transcription error:', err);
      setErrorMsg(err.message || 'Error occurred while transcribing audio.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleUpdateLine = (id: string, newText: string) => {
    const updated = lines.map((l) => (l.id === id ? { ...l, text: newText } : l));
    setLines(updated);
    const combined = updated.map((l) => l.text).join('\n\n');
    setTranscript(combined);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const filteredLines = lines.filter((line) =>
    line.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    line.speaker.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-['Inter'] pb-28">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#c7c4d8]/40">
        <div>
          <div className="flex items-center gap-2 text-[#464555] text-xs mb-1">
            <span className="material-symbols-outlined text-[16px]">transcribe</span>
            <span>{project.name}</span>
            <span>/</span>
            <span className="text-[#4f46e5] font-semibold">Audio Transcript</span>
          </div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">
            Dialogue Transcript &amp; Analysis
          </h1>
          <p className="text-sm text-[#464555] mt-1 max-w-2xl">
            Real verbatim speech transcription extracted via FFmpeg and transcribed by Gemini. Search and edit lines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTranscribeWithAI}
            disabled={isTranscribing}
            className="bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">mic</span>
            <span>{isTranscribing ? 'Transcribing...' : 'Transcribe with Gemini'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-emerald-600">check_circle</span>
          <span>Transcript updates saved to project.</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-red-500">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      {lines.length === 0 ? (
        <div className="bg-white border border-[#c7c4d8]/70 rounded-2xl p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#f2f3ff] text-[#4f46e5] flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">mic_none</span>
          </div>
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#131b2e]">
            No transcript generated yet
          </h3>
          <p className="text-xs text-[#464555] max-w-sm mx-auto">
            Extract the audio from your video and run Gemini transcription to generate synchronized text and speaker cues.
          </p>
          <button
            onClick={handleTranscribeWithAI}
            disabled={isTranscribing}
            className="px-5 py-2.5 bg-[#4f46e5] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#3525cd] transition-all cursor-pointer disabled:opacity-50"
          >
            {isTranscribing ? 'Processing Audio Stream...' : 'Transcribe Video Audio with AI'}
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#c7c4d8]/70 rounded-xl p-6 shadow-xs space-y-6">
          {/* Search Bar */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#eaedff]">
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-base text-[#777587]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transcript lines..."
                className="w-full pl-9 pr-4 py-2 bg-[#faf8ff] border border-[#c7c4d8] rounded-lg text-xs text-[#131b2e] outline-none focus:border-[#4f46e5]"
              />
            </div>
            <span className="text-xs text-[#777587] font-mono">
              {filteredLines.length} segments
            </span>
          </div>

          {/* Transcript Lines List */}
          <div className="space-y-4">
            {filteredLines.map((line) => (
              <div
                key={line.id}
                className="p-4 rounded-xl border border-[#eaedff] bg-[#faf8ff]/50 space-y-2 hover:border-[#c7c4d8] transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#4f46e5]">{line.speaker}</span>
                  <span className="text-[#777587] font-mono">{line.time}</span>
                </div>
                <textarea
                  rows={2}
                  value={line.text}
                  onChange={(e) => handleUpdateLine(line.id, e.target.value)}
                  className="w-full bg-white p-2.5 rounded-lg border border-[#c7c4d8]/60 text-xs text-[#131b2e] leading-relaxed outline-none focus:border-[#4f46e5] resize-none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#c7c4d8]/80 py-4 px-4 sm:px-8 z-20 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 text-xs font-semibold text-[#464555] hover:text-[#131b2e] rounded-lg transition-colors cursor-pointer"
          >
            Dashboard
          </button>
          <button
            onClick={() => onNavigate('suggestions')}
            className="bg-[#4f46e5] hover:bg-[#3525cd] text-white px-6 py-2.5 rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <span>Proceed to AI Suggested Clips</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
