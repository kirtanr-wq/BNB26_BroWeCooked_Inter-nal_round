import React, { useState, useRef } from 'react';
import { ScreenId } from '../types';
import { useProject } from '../context/ProjectContext';

interface CreateProjectScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

export const CreateProjectScreen: React.FC<CreateProjectScreenProps> = ({ onNavigate }) => {
  const { project, setSourceVideo, updateProject, createProject, refreshAssets, token } = useProject();
  const [projectName, setProjectName] = useState(project?.name || 'AI Video Strategy & Repurposing');
  const [description, setDescription] = useState('Transform long-form podcast into high-converting shorts');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(project?.sourceVideo?.url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadFile = (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectName', projectName);
    if (project?.id) formData.append('projectId', project.id);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = async () => {
      setIsUploading(false);
      try {
        let data: any = {};
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          throw new Error(
            xhr.status === 413 || xhr.responseText.includes('File too large')
              ? 'File exceeds the 500 MB upload limit.'
              : `Upload failed with HTTP status ${xhr.status}.`
          );
        }

        if (xhr.status >= 200 && xhr.status < 300 && data.success) {
          const asset = data.asset;
          setSourceVideo({
            filename: asset.filename,
            url: asset.url,
            duration: asset.duration || 15,
            width: asset.width || 1920,
            height: asset.height || 1080,
            size: asset.fileSize || asset.size || file.size,
            mimeType: asset.mimeType || file.type,
          });
          setVideoPreviewUrl(asset.url);
          updateProject({ name: projectName });
          await refreshAssets();
        } else {
          const errMsg = data.error?.message || data.message || (typeof data.error === 'string' ? data.error : null) || `Upload rejected by server (HTTP ${xhr.status})`;
          throw new Error(errMsg);
        }
      } catch (err: any) {
        console.error('File upload error:', err);
        setUploadError(err.message || 'Failed to upload video');
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setUploadError('Network error occurred during upload. Please check connection and retry.');
    };

    xhr.send(formData);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleCreateAndProceed = async () => {
    try {
      await createProject(projectName.trim() || 'New Campaign', description);
      onNavigate('ai_progress');
    } catch (err: any) {
      setUploadError(err.message || 'Could not initialize project.');
    }
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-['Inter'] pb-28">
      {/* Header Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-[#464555] text-xs mb-1">
          <span className="material-symbols-outlined text-[16px]">folder_open</span>
          <span>Projects</span>
          <span>/</span>
          <span className="text-[#4f46e5] font-semibold">New Repurposing Project</span>
        </div>
        <h1 className="font-['Plus_Jakarta_Sans'] text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">
          Create Repurposing Project
        </h1>
        <p className="text-sm text-[#464555] mt-1 max-w-2xl">
          Upload raw footage, audio podcast, or paste a transcript. The AI will detect moments, hooks, and format for multi-channel release.
        </p>
      </div>

      {/* Error Alert */}
      {uploadError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-sm text-red-800 shadow-xs">
          <span className="material-symbols-outlined text-red-500 mt-0.5 shrink-0">error</span>
          <div className="flex-1">
            <strong className="font-semibold block mb-0.5">Upload Error</strong>
            <span>{uploadError}</span>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="text-red-400 hover:text-red-700 text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Settings & Upload Zones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Project Config */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#c7c4d8]/70 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#eaedff]">
              <span className="material-symbols-outlined text-[#4f46e5] text-xl">tune</span>
              <h2 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#131b2e]">
                Project Metadata
              </h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#131b2e] mb-1.5">
                Project Title
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Episode 14: Future of AI Repurposing"
                className="w-full px-3.5 py-2.5 bg-white border border-[#c7c4d8] rounded-lg text-sm text-[#131b2e] focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#131b2e] mb-1.5">
                Campaign Description / Goal
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is the key takeaway or message you want to emphasize?"
                className="w-full px-3.5 py-2.5 bg-white border border-[#c7c4d8] rounded-lg text-sm text-[#131b2e] focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#131b2e] mb-2">
                Target Distribution Channels
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'tiktok', name: 'TikTok & Reels', icon: 'smartphone', ratio: '9:16' },
                  { id: 'youtube', name: 'YouTube Shorts', icon: 'smart_display', ratio: '9:16' },
                  { id: 'linkedin', name: 'LinkedIn Video', icon: 'work', ratio: '1:1 / 16:9' },
                  { id: 'x', name: 'X / Twitter Clip', icon: 'forum', ratio: '16:9 / 1:1' },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg border border-[#c7c4d8]/60 bg-[#f2f3ff]/40 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#4f46e5]">
                        {item.icon}
                      </span>
                      <span className="font-semibold text-[#131b2e] text-[11px]">{item.name}</span>
                    </div>
                    <span className="text-[10px] text-[#777587] font-mono">{item.ratio}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Upload Zone & Preview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#c7c4d8]/70 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#4f46e5] text-xl">upload_file</span>
                <h2 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#131b2e]">
                  Media Source
                </h2>
              </div>
              <span className="text-[11px] text-[#777587]">Supports MP4, MOV, WEBM (Up to 500 MB)</span>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 relative ${
                dragActive
                  ? 'border-[#4f46e5] bg-[#e2dfff]/20'
                  : 'border-[#c7c4d8] hover:border-[#4f46e5] hover:bg-[#f2f3ff]/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,audio/*,.mp4,.mov,.webm,.m4v,.mkv,.avi,.mp3,.wav,.txt"
                className="hidden"
                disabled={isUploading}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleUploadFile(e.target.files[0]);
                  }
                  e.target.value = '';
                }}
              />

              <div className="w-14 h-14 mx-auto rounded-full bg-[#f2f3ff] text-[#4f46e5] flex items-center justify-center mb-4 shadow-xs">
                <span className="material-symbols-outlined text-3xl">cloud_upload</span>
              </div>

              <h3 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#131b2e]">
                {dragActive ? 'Drop your video file here' : 'Drag & drop your video here'}
              </h3>
              <p className="text-xs text-[#464555] mt-1 max-w-sm mx-auto">
                or <span className="text-[#4f46e5] font-semibold underline">browse local files</span> from your computer
              </p>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="mt-5 max-w-xs mx-auto space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#131b2e]">
                    <span>Uploading &amp; extracting audio...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#eaedff] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4f46e5] rounded-full transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Video Preview If Available */}
            {videoPreviewUrl && (
              <div className="p-4 bg-[#faf8ff] rounded-xl border border-[#c7c4d8]/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#006c49] text-base">check_circle</span>
                    <span className="text-xs font-bold text-[#131b2e]">
                      {project.sourceVideo?.filename || 'Active Source Video'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#777587]">
                    {project.sourceVideo?.duration ? `${Math.round(project.sourceVideo.duration)}s` : '15s'} • {project.sourceVideo?.width || 1920}x{project.sourceVideo?.height || 1080}
                  </span>
                </div>
                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-inner">
                  <video
                    src={videoPreviewUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#c7c4d8]/80 py-4 px-4 sm:px-8 z-20 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 text-xs font-semibold text-[#464555] hover:text-[#131b2e] rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCreateAndProceed}
              disabled={isUploading}
              className="bg-[#4f46e5] hover:bg-[#3525cd] text-white px-6 py-2.5 rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
            >
              <span>Analyze Video with Gemini AI</span>
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
