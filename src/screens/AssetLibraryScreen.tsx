import React, { useState } from 'react';
import { ScreenId, Asset } from '../types';
import { useProject } from '../context/ProjectContext';

interface AssetLibraryScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const AssetLibraryScreen: React.FC<AssetLibraryScreenProps> = ({ onNavigate }) => {
  const { realAssets, refreshAssets, creatorStats, setSourceVideo, token } = useProject();
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Exact real storage calculation directly from stored asset sizes (0 MB if empty)
  const totalUsedBytes = realAssets.reduce((sum, a) => sum + (a.fileSize || 0), 0);
  const totalUsedMB = Math.round((totalUsedBytes / (1024 * 1024)) * 10) / 10;
  const storageLimitMB = 500; // Configured per-file upload limit & free-tier storage quota
  const storagePercent = totalUsedMB > 0 ? Math.min(100, Math.round((totalUsedMB / storageLimitMB) * 100)) : 0;

  const filteredAssets = realAssets.filter((a) => {
    if (filterType === 'Videos' && a.type !== 'video') return false;
    if (filterType === 'Clips' && a.type !== 'clip') return false;
    if (filterType === 'Transcripts' && a.type !== 'transcript') return false;
    if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this asset?')) return;
    setIsDeleting(id);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`/api/assets/${id}`, { method: 'DELETE', headers });
      await refreshAssets();
    } catch (err) {
      console.error('Delete asset error:', err);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleOpenInEditor = (asset: Asset) => {
    setSourceVideo({
      filename: asset.filename || asset.name,
      url: asset.previewUrl || asset.url || `/api/media/${asset.filename}`,
      duration: 15,
      width: 1920,
      height: 1080,
      size: asset.fileSize || 1000000,
      mimeType: 'video/mp4',
    });
    onNavigate('clip_editor');
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 font-['Inter'] pb-28">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-[#464555] text-xs mb-1">
            <span className="material-symbols-outlined text-[16px]">folder_special</span>
            <span>Workspace Library</span>
            <span>/</span>
            <span className="text-[#4f46e5] font-semibold">Active Creator Assets</span>
          </div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">
            Asset Library
          </h1>
          <p className="text-sm text-[#464555] mt-1 max-w-2xl">
            All your uploaded footage, trimmed highlights, and exported deliverables organized in one secure workspace.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshAssets()}
            className="bg-white text-[#131b2e] border border-[#c7c4d8] hover:bg-[#f2f3ff] text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs cursor-pointer active:scale-98"
          >
            <span className="material-symbols-outlined text-[18px] text-[#464555]">sync</span>
            <span>Refresh</span>
          </button>
          <button
            onClick={() => onNavigate('create_project')}
            className="bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs cursor-pointer active:scale-98"
          >
            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
            <span>+ Upload Asset</span>
          </button>
        </div>
      </div>

      {/* Storage Capacity Bar (Derived from Real Data) */}
      <div className="bg-white border border-[#c7c4d8] rounded-xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex-1 max-w-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#4f46e5]">cloud</span>
              <span className="text-xs font-bold text-[#131b2e]">Cloud Storage Used</span>
            </div>
            <span className="text-xs text-[#464555]">
              <strong className="text-[#131b2e] font-bold">
                {totalUsedMB} MB
              </strong>{' '}
              used of {storageLimitMB} MB Quota
            </span>
          </div>
          <div className="w-full h-2 bg-[#f2f3ff] rounded-full overflow-hidden flex">
            <div
              className="h-full bg-[#4f46e5] rounded-full transition-all duration-300"
              style={{
                width: `${storagePercent}%`,
              }}
            />
          </div>
          <p className="text-[11px] text-[#464555] mt-1.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-[#006c49]">check_circle</span>
            Real-time storage isolated by creator profile
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Videos', 'Clips', 'Transcripts'].map((pill) => (
            <button
              key={pill}
              onClick={() => setFilterType(pill)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                filterType === pill
                  ? 'bg-[#4f46e5] text-white shadow-xs'
                  : 'bg-[#f2f3ff] text-[#464555] hover:bg-[#eaedff]'
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Cards Grid */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white border border-[#c7c4d8]/70 rounded-2xl p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#f2f3ff] text-[#4f46e5] flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">video_library</span>
          </div>
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#131b2e]">
            No assets found
          </h3>
          <p className="text-xs text-[#464555] max-w-sm mx-auto">
            Upload raw footage, trim your first clip, or export a deliverable to populate your library.
          </p>
          <button
            onClick={() => onNavigate('create_project')}
            className="px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#3525cd] transition-all cursor-pointer"
          >
            Create New Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="bg-white border border-[#c7c4d8]/70 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col justify-between group"
            >
              <div>
                {/* Playable Video Player Container */}
                <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
                  <video
                    src={asset.previewUrl || `/api/media/${asset.filename}`}
                    poster={asset.thumbnail}
                    controls
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded font-mono pointer-events-none">
                    {asset.resolution || asset.aspect || '1080p'}
                  </div>
                </div>

                {/* Metadata */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold text-[#131b2e] truncate" title={asset.name}>
                      {asset.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f2f3ff] text-[#4f46e5] uppercase">
                      {asset.type}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#777587] font-mono">
                    {asset.size} • {asset.duration || '15s'} • {asset.updatedAt}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {asset.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#faf8ff] text-[#777587] border border-[#eaedff]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Card Actions */}
              <div className="p-3 bg-[#faf8ff] border-t border-[#eaedff] flex items-center justify-between text-xs">
                <a
                  href={`/api/media/${asset.filename}?download=1`}
                  download={asset.filename}
                  className="px-2.5 py-1 bg-white border border-[#c7c4d8] text-[#131b2e] text-[11px] font-semibold rounded hover:bg-[#f2f3ff] flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  <span>Download</span>
                </a>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenInEditor(asset)}
                    className="px-2.5 py-1 bg-[#4f46e5] text-white text-[11px] font-semibold rounded hover:bg-[#3525cd] cursor-pointer"
                  >
                    Open in Editor
                  </button>
                  <button
                    onClick={(e) => handleDelete(asset.id, e)}
                    disabled={isDeleting === asset.id}
                    className="p-1 rounded text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Delete Asset"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
