import React, { useState } from 'react';
import { ScreenId, Asset } from '../types';
import { useProject } from '../context/ProjectContext';

interface AssetLibraryScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const AssetLibraryScreen: React.FC<AssetLibraryScreenProps> = ({ onNavigate }) => {
  const { realAssets, refreshAssets, setSourceVideo, token, user } = useProject();
  const [filterType, setFilterType] = useState<'All' | 'Drafts' | 'Shared' | 'Analyzed'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Upload/Publish Modal state for Drafts
  const [uploadModalAsset, setUploadModalAsset] = useState<Asset | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Exact real storage calculation directly from stored asset sizes (0 MB if empty)
  const totalUsedBytes = realAssets.reduce((sum, a) => sum + (a.fileSize || 0), 0);
  const totalUsedMB = Math.round((totalUsedBytes / (1024 * 1024)) * 10) / 10;
  const storageLimitMB = 500;
  const storagePercent = totalUsedMB > 0 ? Math.min(100, Math.round((totalUsedMB / storageLimitMB) * 100)) : 0;

  // Counts for the 3 distinct cards
  const draftsCount = realAssets.filter(
    (a) => a.status === 'draft' || a.name.toLowerCase().includes('draft') || (!a.status && a.type === 'video')
  ).length;

  const sharedCount = realAssets.filter((a) => a.status === 'shared').length;

  const analyzedCount = realAssets.filter(
    (a) => a.status === 'analyzed' || a.type === 'clip' || a.name.toLowerCase().includes('clip')
  ).length;

  const filteredAssets = realAssets.filter((a) => {
    if (filterType === 'Drafts') {
      const isDraft = a.status === 'draft' || a.name.toLowerCase().includes('draft') || (!a.status && a.type === 'video');
      if (!isDraft) return false;
    }
    if (filterType === 'Shared') {
      if (a.status !== 'shared') return false;
    }
    if (filterType === 'Analyzed') {
      const isAnalyzed = a.status === 'analyzed' || a.type === 'clip' || a.name.toLowerCase().includes('clip');
      if (!isAnalyzed) return false;
    }
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
      setToastMessage('Asset deleted successfully.');
      setTimeout(() => setToastMessage(null), 3000);
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

  // Publish / Upload Draft Handler
  const handleMarkAsUploaded = async (asset: Asset, platform?: string) => {
    setIsUpdatingStatus(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch(`/api/assets/${asset.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'published' }),
      });
      await refreshAssets();
      setUploadModalAsset(null);
      setToastMessage(`Draft marked as published to ${platform || 'your collection'}!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Update status error:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const copyLink = (filename: string) => {
    const url = `${window.location.origin}/api/media/${filename}`;
    navigator.clipboard.writeText(url);
    setToastMessage('Video link copied to clipboard!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 font-['Inter'] pb-28">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#131b2e] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-fadeIn border border-[#4f46e5]/40">
          <span className="material-symbols-outlined text-emerald-400 text-sm">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-[#464555] text-xs mb-1">
            <span className="material-symbols-outlined text-[16px]">folder_special</span>
            <span>Workspace Library</span>
            <span>/</span>
            <span className="text-[#4f46e5] font-semibold">Creator Assets</span>
          </div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">
            Asset Library
          </h1>
          <p className="text-sm text-[#464555] mt-1 max-w-2xl">
            Manage your drafts, shared creator videos, and Google Gemini AI analyzed clips all in one place.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refreshAssets()}
            className="bg-white text-[#131b2e] border border-[#c7c4d8] hover:bg-[#f2f3ff] text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs cursor-pointer active:scale-98 transition-all"
          >
            <span className="material-symbols-outlined text-[18px] text-[#464555]">sync</span>
            <span>Refresh</span>
          </button>
          <button
            onClick={() => onNavigate('create_project')}
            className="bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs cursor-pointer active:scale-98 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
            <span>+ New Video</span>
          </button>
        </div>
      </div>

      {/* 3 Top Cards: Drafts, Shared, and Analyzed with Gemini */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Drafts */}
        <div
          onClick={() => setFilterType('Drafts')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group shadow-xs ${
            filterType === 'Drafts'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/40 shadow-md'
              : 'bg-white border-[#c7c4d8]/70 hover:border-amber-400 hover:shadow-md'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-xl">edit_document</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                filterType === 'Drafts' ? 'bg-amber-200 text-amber-900' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                Drafts
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-['Plus_Jakarta_Sans'] text-[#131b2e]">{draftsCount}</span>
                <span className="text-xs text-[#464555] font-semibold">Videos in Draft</span>
              </div>
              <p className="text-[11px] text-[#777587] mt-1">
                Saved raw footage &amp; recordings ready for editing or direct upload.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-[#eaedff] flex items-center justify-between text-[11px] font-semibold text-amber-800">
            <span>Click to view drafts</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </div>
        </div>

        {/* Card 2: Shared Videos */}
        <div
          onClick={() => setFilterType('Shared')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group shadow-xs ${
            filterType === 'Shared'
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-400/40 shadow-md'
              : 'bg-white border-[#c7c4d8]/70 hover:border-blue-400 hover:shadow-md'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-xl">share</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                filterType === 'Shared' ? 'bg-blue-200 text-blue-900' : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                Profile Shared
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-['Plus_Jakarta_Sans'] text-[#131b2e]">{sharedCount}</span>
                <span className="text-xs text-[#464555] font-semibold">Shared Videos</span>
              </div>
              <p className="text-[11px] text-[#777587] mt-1">
                Videos published to your creator profile collection &amp; public links.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-[#eaedff] flex items-center justify-between text-[11px] font-semibold text-blue-800">
            <span>View shared profile</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </div>
        </div>

        {/* Card 3: Analyzed Videos with Gemini */}
        <div
          onClick={() => setFilterType('Analyzed')}
          className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group shadow-xs ${
            filterType === 'Analyzed'
              ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-400/40 shadow-md'
              : 'bg-white border-[#c7c4d8]/70 hover:border-indigo-400 hover:shadow-md'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-xl">auto_awesome</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                filterType === 'Analyzed' ? 'bg-indigo-200 text-indigo-900' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              }`}>
                Gemini AI
              </span>
            </div>

            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-['Plus_Jakarta_Sans'] text-[#131b2e]">{analyzedCount}</span>
                <span className="text-xs text-[#464555] font-semibold">AI Analyzed</span>
              </div>
              <p className="text-[11px] text-[#777587] mt-1">
                Transcribed, viral-scored &amp; clip-isolated by Google Gemini AI.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-[#eaedff] flex items-center justify-between text-[11px] font-semibold text-indigo-800">
            <span>Explore AI clips</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Storage Capacity */}
      <div className="bg-white border border-[#c7c4d8]/70 rounded-xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Active Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilterType('All')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              filterType === 'All' ? 'bg-[#131b2e] text-white shadow-xs' : 'bg-[#f2f3ff] text-[#464555] hover:bg-[#eaedff]'
            }`}
          >
            All Assets ({realAssets.length})
          </button>
          <button
            onClick={() => setFilterType('Drafts')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'Drafts' ? 'bg-amber-600 text-white shadow-xs' : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <span className="material-symbols-outlined text-xs">edit_document</span>
            <span>Drafts ({draftsCount})</span>
          </button>
          <button
            onClick={() => setFilterType('Shared')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'Shared' ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <span className="material-symbols-outlined text-xs">share</span>
            <span>Shared ({sharedCount})</span>
          </button>
          <button
            onClick={() => setFilterType('Analyzed')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'Analyzed' ? 'bg-[#4f46e5] text-white shadow-xs' : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <span className="material-symbols-outlined text-xs">auto_awesome</span>
            <span>Gemini AI ({analyzedCount})</span>
          </button>
        </div>

        {/* Search & Storage Indicator */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#777587] text-sm pointer-events-none">search</span>
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#f8f9ff] border border-[#c7c4d8] rounded-lg text-xs text-[#131b2e] outline-none focus:border-[#4f46e5] w-48"
            />
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-[#777587]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{totalUsedMB} MB / {storageLimitMB} MB</span>
          </div>
        </div>
      </div>

      {/* Creator Profile View Banner (Displayed when Shared tab is active) */}
      {filterType === 'Shared' && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 border border-blue-800/40 rounded-2xl p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center text-xl shadow-lg border border-blue-400/30">
              {user?.username?.[0] || 'A'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-white">
                  {user?.username || 'Alex Rivera'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Creator Profile
                </span>
              </div>
              <p className="text-xs text-blue-200/90 mt-0.5">
                Displaying all {sharedCount} shared videos from your workspace accessible to your audience and platforms.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/profile/${user?.id || 'creator'}`);
              setToastMessage('Creator profile link copied to clipboard!');
              setTimeout(() => setToastMessage(null), 3000);
            }}
            className="px-4 py-2 bg-white text-blue-950 font-bold text-xs rounded-xl hover:bg-blue-50 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-sm">link</span>
            <span>Copy Profile Link</span>
          </button>
        </div>
      )}

      {/* Drafts Filter Banner */}
      {filterType === 'Drafts' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-lg">edit_note</span>
            <span>
              <strong>Drafts Workspace:</strong> These videos are saved as drafts. Choose <strong>Edit Video</strong> to open the clip trimmer or <strong>Upload / Publish</strong> to finalize.
            </span>
          </div>
        </div>
      )}

      {/* Gemini AI Filter Banner */}
      {filterType === 'Analyzed' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600 text-lg">auto_awesome</span>
            <span>
              <strong>Gemini AI Intelligence:</strong> These videos have speech transcriptions and extracted viral hook timestamps generated by Google Gemini.
            </span>
          </div>
          <button
            onClick={() => onNavigate('suggestions')}
            className="px-3 py-1 bg-[#4f46e5] text-white rounded-lg text-xs font-semibold hover:bg-[#3525cd] transition-all cursor-pointer"
          >
            View AI Suggestions
          </button>
        </div>
      )}

      {/* Asset Cards Grid */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white border border-[#c7c4d8]/70 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#f2f3ff] text-[#4f46e5] flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">video_library</span>
          </div>
          <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#131b2e]">
            No {filterType !== 'All' ? filterType.toLowerCase() : ''} assets found
          </h3>
          <p className="text-xs text-[#464555] max-w-sm mx-auto">
            {filterType === 'Drafts'
              ? 'You have no draft videos yet. Upload raw footage to save a draft.'
              : filterType === 'Shared'
              ? 'No shared videos yet. Click "Share Video" when creating a project to publish here.'
              : filterType === 'Analyzed'
              ? 'No Gemini analyzed videos yet. Run "Analyze with Google Gemini" to extract AI clips.'
              : 'Upload raw footage or start a new project to populate your workspace.'}
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
          {filteredAssets.map((asset) => {
            const isDraft = asset.status === 'draft' || asset.name.toLowerCase().includes('draft') || (!asset.status && asset.type === 'video');
            const isShared = asset.status === 'shared';
            const isAnalyzed = asset.status === 'analyzed' || asset.type === 'clip' || asset.name.toLowerCase().includes('clip');

            return (
              <div
                key={asset.id}
                className={`bg-white border rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-200 flex flex-col justify-between group shadow-xs ${
                  isDraft
                    ? 'border-amber-300 ring-1 ring-amber-200/60'
                    : isShared
                    ? 'border-blue-300 ring-1 ring-blue-200/60'
                    : 'border-[#c7c4d8]/70 hover:border-[#4f46e5]'
                }`}
              >
                <div>
                  {/* Status Banner at the top of Card */}
                  {isDraft && (
                    <div className="bg-amber-500/10 border-b border-amber-200/80 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-amber-800 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-amber-600">edit_document</span>
                        <span>This video is a <strong>Draft</strong></span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-200 text-amber-900 uppercase">
                        Draft
                      </span>
                    </div>
                  )}

                  {isShared && (
                    <div className="bg-blue-500/10 border-b border-blue-200/80 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-blue-800 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-blue-600">share</span>
                        <span>Shared to Profile</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-200 text-blue-900 uppercase">
                        Shared
                      </span>
                    </div>
                  )}

                  {isAnalyzed && !isDraft && !isShared && (
                    <div className="bg-indigo-500/10 border-b border-indigo-200/80 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-indigo-800 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-indigo-600">auto_awesome</span>
                        <span>Analyzed with Gemini</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-200 text-indigo-900 uppercase">
                        AI Analyzed
                      </span>
                    </div>
                  )}

                  {/* Playable Video Player Container */}
                  <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
                    <video
                      src={asset.previewUrl || `/api/media/${asset.filename}`}
                      poster={asset.thumbnail}
                      controls
                      preload="metadata"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] px-2 py-0.5 rounded font-mono pointer-events-none">
                      {asset.resolution || asset.aspect || '1080p'}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs font-bold text-[#131b2e] truncate leading-tight" title={asset.name}>
                        {asset.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#f2f3ff] text-[#4f46e5] uppercase shrink-0">
                        {asset.type}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#777587] font-mono">
                      {asset.size} • {asset.duration || '15s'} • {asset.updatedAt}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-0.5">
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
                <div className="p-3 bg-[#faf8ff] border-t border-[#eaedff] flex flex-col gap-2">
                  {/* SPECIFIC 2 BUTTONS ON DRAFT VIDEOS */}
                  {isDraft ? (
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-[#777587] font-medium flex items-center justify-between">
                        <span>Draft Options:</span>
                        <span className="text-amber-700 font-bold">Unpublished Draft</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Button 1: Edit Video */}
                        <button
                          onClick={() => handleOpenInEditor(asset)}
                          className="px-3 py-1.5 bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-98"
                          title="Open clip editor trimmer"
                        >
                          <span className="material-symbols-outlined text-sm">content_cut</span>
                          <span>Edit Video</span>
                        </button>

                        {/* Button 2: Upload / Publish */}
                        <button
                          onClick={() => setUploadModalAsset(asset)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-98"
                          title="Finalize and upload draft"
                        >
                          <span className="material-symbols-outlined text-sm">publish</span>
                          <span>Upload Draft</span>
                        </button>
                      </div>
                    </div>
                  ) : isShared ? (
                    /* Shared Video Action Buttons */
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => copyLink(asset.filename || asset.name)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">link</span>
                        <span>Copy Link</span>
                      </button>
                      <button
                        onClick={() => handleOpenInEditor(asset)}
                        className="px-2.5 py-1.5 bg-white border border-[#c7c4d8] hover:bg-[#f2f3ff] text-[#131b2e] rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Edit Clip</span>
                      </button>
                    </div>
                  ) : (
                    /* Standard / Analyzed Video Action Buttons */
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleOpenInEditor(asset)}
                        className="px-3 py-1.5 bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                        <span>Edit in Trimmer</span>
                      </button>
                      <button
                        onClick={() => onNavigate('suggestions')}
                        className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#4f46e5] rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">auto_awesome</span>
                        <span>View Clips</span>
                      </button>
                    </div>
                  )}

                  {/* Secondary Toolbar: Download & Delete */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#eaedff]/60 text-[11px]">
                    <a
                      href={`/api/media/${asset.filename}?download=1`}
                      download={asset.filename}
                      className="text-[#777587] hover:text-[#131b2e] flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">download</span>
                      <span>Download</span>
                    </a>

                    <button
                      onClick={(e) => handleDelete(asset.id, e)}
                      disabled={isDeleting === asset.id}
                      className="text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">delete</span>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload / Publish Modal for Drafts */}
      {uploadModalAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#c7c4d8]/70 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
              <div className="flex items-center gap-2 text-emerald-600">
                <span className="material-symbols-outlined text-2xl">publish</span>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-base text-[#131b2e]">Upload / Publish Draft</h3>
              </div>
              <button
                onClick={() => setUploadModalAsset(null)}
                className="text-[#777587] hover:text-[#131b2e] cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-[#464555]">
                You are ready to upload <strong>{uploadModalAsset.name}</strong>. Choose a target platform or mark as published in your library:
              </p>

              {/* Platform Launch Links */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <a
                  href="https://www.tiktok.com/creator-center/upload"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleMarkAsUploaded(uploadModalAsset, 'TikTok')}
                  className="p-3 bg-[#faf8ff] hover:bg-indigo-50 border border-[#c7c4d8]/60 hover:border-[#4f46e5] rounded-xl flex items-center gap-2.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-indigo-600">smartphone</span>
                  <div className="text-left">
                    <span className="text-xs font-bold text-[#131b2e] block">TikTok Studio</span>
                    <span className="text-[10px] text-[#777587]">9:16 Shorts</span>
                  </div>
                </a>

                <a
                  href="https://studio.youtube.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleMarkAsUploaded(uploadModalAsset, 'YouTube Shorts')}
                  className="p-3 bg-[#faf8ff] hover:bg-indigo-50 border border-[#c7c4d8]/60 hover:border-[#4f46e5] rounded-xl flex items-center gap-2.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-red-600">smart_display</span>
                  <div className="text-left">
                    <span className="text-xs font-bold text-[#131b2e] block">YouTube Shorts</span>
                    <span className="text-[10px] text-[#777587]">Shorts Player</span>
                  </div>
                </a>

                <a
                  href="https://www.linkedin.com/feed/?shareActive=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleMarkAsUploaded(uploadModalAsset, 'LinkedIn')}
                  className="p-3 bg-[#faf8ff] hover:bg-indigo-50 border border-[#c7c4d8]/60 hover:border-[#4f46e5] rounded-xl flex items-center gap-2.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-blue-600">work</span>
                  <div className="text-left">
                    <span className="text-xs font-bold text-[#131b2e] block">LinkedIn Post</span>
                    <span className="text-[10px] text-[#777587]">1:1 Square</span>
                  </div>
                </a>

                <a
                  href="https://x.com/compose/post"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleMarkAsUploaded(uploadModalAsset, 'X / Twitter')}
                  className="p-3 bg-[#faf8ff] hover:bg-indigo-50 border border-[#c7c4d8]/60 hover:border-[#4f46e5] rounded-xl flex items-center gap-2.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-slate-800">forum</span>
                  <div className="text-left">
                    <span className="text-xs font-bold text-[#131b2e] block">X Composer</span>
                    <span className="text-[10px] text-[#777587]">Feed Clip</span>
                  </div>
                </a>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-[#eaedff]">
              <button
                onClick={() => {
                  const asset = uploadModalAsset;
                  setUploadModalAsset(null);
                  handleOpenInEditor(asset);
                }}
                className="text-xs font-semibold text-[#4f46e5] hover:underline cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">content_cut</span>
                <span>Open in Editor instead</span>
              </button>

              <button
                onClick={() => handleMarkAsUploaded(uploadModalAsset, 'Library')}
                disabled={isUpdatingStatus}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {isUpdatingStatus ? 'Updating...' : 'Mark as Uploaded'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
