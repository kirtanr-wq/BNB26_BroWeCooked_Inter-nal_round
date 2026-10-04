import React, { useState } from 'react';
import { ScreenId } from '../types';
import { useProject } from '../context/ProjectContext';

interface FinalExportScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const FinalExportScreen: React.FC<FinalExportScreenProps> = ({ onNavigate }) => {
  const { project, selectedClip, addExportedVideo, refreshAssets, token } = useProject();

  const [aspect, setAspect] = useState<'9:16' | '1:1' | '16:9'>('9:16');
  const [includeHook, setIncludeHook] = useState<boolean>(true);
  const [hookText, setHookText] = useState<string>(
    project.selectedHook?.hookText || selectedClip?.hook || 'Stop copying 16:9 videos straight to TikTok'
  );

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportComplete, setExportComplete] = useState<boolean>(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [exportedFilename, setExportedFilename] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStartExport = async () => {
    setIsExporting(true);
    setErrorMsg(null);

    const sourceFilename =
      (project?.generatedClips || [])[0]?.filename ||
      project?.sourceVideo?.filename ||
      'sample_podcast_ep14.mp4';

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/video/export', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          filename: sourceFilename,
          targetAspect: aspect,
          overlayHook: includeHook ? hookText : undefined,
          projectName: project.name || 'CreatorAi_Project',
          projectId: project.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Video export failed on server.');
      }

      const asset = data.asset;
      setExportUrl(asset.url);
      setDownloadUrl(data.downloadUrl || asset.url);
      setExportedFilename(asset.filename);
      setExportComplete(true);

      addExportedVideo({
        id: asset.id,
        name: asset.name,
        url: asset.url,
        downloadUrl: data.downloadUrl || asset.url,
        filename: asset.filename,
        aspect,
      });

      await refreshAssets();
    } catch (err: any) {
      console.error('Export error:', err);
      setErrorMsg(err.message || 'Error occurred while rendering final video.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-['Inter'] pb-28">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#c7c4d8]/40">
        <div>
          <div className="flex items-center gap-2 text-[#464555] text-xs mb-1">
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span>{project.name}</span>
            <span>/</span>
            <span className="text-[#4f46e5] font-semibold">Production Render &amp; Export</span>
          </div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">
            Final Render &amp; Export
          </h1>
          <p className="text-sm text-[#464555] mt-1 max-w-2xl">
            Mux high-resolution video streams, burn viral hook overlays, and generate clean production MP4 deliverables.
          </p>
        </div>

        <button
          onClick={() => onNavigate('assets')}
          className="bg-white border border-[#c7c4d8] hover:bg-[#f2f3ff] text-[#131b2e] text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-base">folder</span>
          <span>View Asset Library</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-500">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Export Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Export Controls & Settings */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#c7c4d8]/70 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#eaedff]">
              <span className="material-symbols-outlined text-[#4f46e5] text-lg">settings</span>
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#131b2e]">
                Render Specifications
              </h3>
            </div>

            {/* Aspect Ratio Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#131b2e]">
                Output Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: '9:16', label: '9:16 Vertical', sub: 'TikTok, Reels' },
                  { id: '1:1', label: '1:1 Square', sub: 'LinkedIn, Feed' },
                  { id: '16:9', label: '16:9 Landscape', sub: 'YouTube' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAspect(item.id as any)}
                    className={`p-3 rounded-lg border text-center transition-all cursor-pointer ${
                      aspect === item.id
                        ? 'border-[#4f46e5] bg-[#faf8ff] text-[#4f46e5] font-bold shadow-xs'
                        : 'border-[#c7c4d8]/70 hover:border-[#4f46e5]/40 text-[#464555]'
                    }`}
                  >
                    <div className="text-xs">{item.label}</div>
                    <div className="text-[10px] text-[#777587] mt-0.5">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Hook Overlay Setting */}
            <div className="space-y-3 pt-2 border-t border-[#eaedff]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#131b2e] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#4f46e5]">subtitles</span>
                  <span>Burn Hook Text Overlay</span>
                </label>
                <input
                  type="checkbox"
                  checked={includeHook}
                  onChange={(e) => setIncludeHook(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                />
              </div>

              {includeHook && (
                <textarea
                  rows={3}
                  value={hookText}
                  onChange={(e) => setHookText(e.target.value)}
                  placeholder="Text banner displayed during the first 3.5 seconds"
                  className="w-full p-3 bg-[#faf8ff] border border-[#c7c4d8] rounded-lg text-xs text-[#131b2e] outline-none focus:border-[#4f46e5] resize-none"
                />
              )}
            </div>

            {/* Codec specs */}
            <div className="p-3.5 bg-[#faf8ff] rounded-lg border border-[#c7c4d8]/60 text-xs text-[#464555] space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Video Codec:</span>
                <span className="text-[#131b2e] font-semibold">H.264 / AVC (Faststart)</span>
              </div>
              <div className="flex justify-between">
                <span>Audio Codec:</span>
                <span className="text-[#131b2e] font-semibold">AAC Stereo 192 kbps</span>
              </div>
              <div className="flex justify-between">
                <span>Container:</span>
                <span className="text-[#131b2e] font-semibold">MPEG-4 (.mp4)</span>
              </div>
            </div>

            {/* Trigger Button */}
            <button
              onClick={handleStartExport}
              disabled={isExporting}
              className="w-full py-3 bg-[#4f46e5] hover:bg-[#3525cd] text-white font-bold text-xs rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {isExporting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Rendering with FFmpeg...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">video_settings</span>
                  <span>Render &amp; Export Video File</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Video Deliverable Preview & Download */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#c7c4d8]/70 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006c49] text-lg">movie</span>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#131b2e]">
                  {exportComplete ? 'Exported Master Deliverable' : 'Source Media Preview'}
                </h3>
              </div>
              {exportComplete && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#6ffbbe]/40 text-[#006c49] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#006c49]"></span>
                  Ready to Download
                </span>
              )}
            </div>

            {/* Player Container */}
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
              <video
                src={exportUrl || (project?.generatedClips || [])[0]?.url || project?.sourceVideo?.url || '/api/media/sample_podcast_ep14.mp4'}
                controls
                className="w-full h-full object-contain"
                playsInline
              />
            </div>

            {/* Action Bar when Export is Complete */}
            {exportComplete && downloadUrl && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-emerald-900 block">
                    {exportedFilename || 'creatorai_export.mp4'}
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    Render finished. Ready for social publishing.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={downloadUrl}
                    download={exportedFilename || 'creatorai_export.mp4'}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">download</span>
                    <span>Download MP4</span>
                  </a>
                  <button
                    onClick={() => onNavigate('assets')}
                    className="px-3.5 py-2 bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-lg hover:bg-emerald-100/50 transition-colors cursor-pointer"
                  >
                    Asset Library
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
