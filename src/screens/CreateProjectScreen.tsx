import React, { useState, useRef, useEffect } from 'react';
import { ScreenId } from '../types';
import { useProject } from '../context/ProjectContext';

interface CreateProjectScreenProps {
  onNavigate: (screen: ScreenId) => void;
}

interface ChannelConfig {
  id: string;
  name: string;
  icon: string;
  ratioLabel: string;
  ratios: string[];
  externalUrl: string;
  externalLabel: string;
  description: string;
}

const CHANNELS: ChannelConfig[] = [
  {
    id: 'tiktok',
    name: 'TikTok & Reels',
    icon: 'smartphone',
    ratioLabel: '9:16',
    ratios: ['9:16'],
    externalUrl: 'https://www.tiktok.com/creator-center/upload',
    externalLabel: 'Open TikTok Studio',
    description: 'Full vertical phone format with high engagement overlays',
  },
  {
    id: 'youtube',
    name: 'YouTube Shorts',
    icon: 'smart_display',
    ratioLabel: '9:16',
    ratios: ['9:16'],
    externalUrl: 'https://studio.youtube.com/',
    externalLabel: 'Open YouTube Studio',
    description: 'Vertical Shorts player with subscribe & remix features',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Video',
    icon: 'work',
    ratioLabel: '1:1 / 16:9',
    ratios: ['1:1', '16:9'],
    externalUrl: 'https://www.linkedin.com/feed/?shareActive=true',
    externalLabel: 'Open LinkedIn Post',
    description: 'Professional feed cards for B2B thought leadership',
  },
  {
    id: 'x',
    name: 'X / Twitter Clip',
    icon: 'forum',
    ratioLabel: '16:9 / 1:1',
    ratios: ['16:9', '1:1'],
    externalUrl: 'https://x.com/compose/post',
    externalLabel: 'Open X Composer',
    description: 'Snappy feed playback optimized for rapid viral shares',
  },
];

export const CreateProjectScreen: React.FC<CreateProjectScreenProps> = ({ onNavigate }) => {
  const { project, setSourceVideo, updateProject, createProject, refreshAssets, token, user } = useProject();
  const [projectName, setProjectName] = useState(project?.name || 'AI Video Strategy & Repurposing');
  const [description, setDescription] = useState('Transform long-form podcast into high-converting shorts');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(project?.sourceVideo?.url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Target Channel & Non-Crop Ratio States
  const [selectedChannelId, setSelectedChannelId] = useState<string>('tiktok');
  const selectedChannel = CHANNELS.find((c) => c.id === selectedChannelId) || CHANNELS[0];
  const [activeRatio, setActiveRatio] = useState<string>(selectedChannel.ratios[0]);
  const [fitBackgroundStyle, setFitBackgroundStyle] = useState<'blur' | 'dark'>('blur');

  // Webcam & Screen Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingType, setRecordingType] = useState<'camera' | 'screen' | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync active ratio when channel changes
  useEffect(() => {
    if (!selectedChannel.ratios.includes(activeRatio)) {
      setActiveRatio(selectedChannel.ratios[0]);
    }
  }, [selectedChannelId]);

  // Upload file handler
  const handleUploadFile = (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectName', projectName);
    formData.append('status', 'draft'); // Saved directly to drafts!
    formData.append('targetChannels', JSON.stringify([selectedChannel.id]));
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
          updateProject({
            name: projectName,
            targetPlatform: selectedChannel.id as any,
          });
          await refreshAssets();
        } else {
          const errMsg = data.error?.message || data.message || `Upload rejected by server (HTTP ${xhr.status})`;
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

  // Start in-browser recording (Camera or Screen)
  const handleStartRecording = async (type: 'camera' | 'screen') => {
    setUploadError(null);
    try {
      let stream: MediaStream;
      if (type === 'camera') {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      }

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      setRecordingType(type);
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        clearInterval(recordingTimerRef.current!);
        stream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(recordedChunksRef.current, { type: 'video/mp4' });
        const recordName = `${type === 'camera' ? 'Camera_Recording' : 'Screen_Capture'}_${Date.now()}.mp4`;
        const recordedFile = new File([blob], recordName, { type: 'video/mp4' });

        setIsRecording(false);
        setRecordingType(null);
        handleUploadFile(recordedFile);
      };

      recorder.start(500); // 500ms chunking
    } catch (err: any) {
      console.warn('Recording access error:', err);
      setUploadError(err.message || 'Could not access camera or screen capture.');
      setIsRecording(false);
      setRecordingType(null);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
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

  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareCopied, setShareCopied] = useState<boolean>(false);

  // 1. Save Draft Handler
  const handleSaveDraft = async () => {
    try {
      await createProject(projectName.trim() || 'New Campaign Draft', description);
      updateProject({
        targetPlatform: selectedChannel.id as any,
        status: 'draft',
      });
      if (project?.sourceVideo?.filename) {
        await fetch(`/api/assets/${project.sourceVideo.filename}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ status: 'draft' }),
        }).catch(() => {});
      }
      await refreshAssets();
      setActionSuccessMessage('Video footage saved as a Draft in your Asset Library!');
      setTimeout(() => onNavigate('assets'), 1000);
    } catch (err: any) {
      setUploadError(err.message || 'Could not save draft.');
    }
  };

  // 2. Share Video Handler
  const handleShareVideo = async () => {
    try {
      await createProject(projectName.trim() || 'Shared Campaign', description);
      updateProject({
        targetPlatform: selectedChannel.id as any,
        status: 'ready',
      });
      if (project?.sourceVideo?.filename) {
        await fetch(`/api/assets/${project.sourceVideo.filename}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ status: 'shared' }),
        }).catch(() => {});
      }
      await refreshAssets();
      setShowShareModal(true);
    } catch (err: any) {
      setUploadError(err.message || 'Could not share video.');
    }
  };

  // 3. Analyze with Google Gemini Handler
  const handleAnalyzeWithGemini = async () => {
    try {
      await createProject(projectName.trim() || 'New AI Campaign', description);
      updateProject({
        targetPlatform: selectedChannel.id as any,
        status: 'processing',
      });
      if (project?.sourceVideo?.filename) {
        await fetch(`/api/assets/${project.sourceVideo.filename}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ status: 'analyzed' }),
        }).catch(() => {});
      }
      await refreshAssets();
      onNavigate('ai_progress');
    } catch (err: any) {
      setUploadError(err.message || 'Could not initialize Gemini AI analysis.');
    }
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-['Inter'] pb-36">
      {/* Header Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-[#464555] text-xs mb-1">
          <span className="material-symbols-outlined text-[16px]">folder_open</span>
          <span>Projects</span>
          <span>/</span>
          <span className="text-[#4f46e5] font-semibold">New Repurposing Project</span>
        </div>
        <h1 className="font-['Plus_Jakarta_Sans'] text-2xl md:text-3xl font-bold text-[#131b2e] tracking-tight">
          Upload &amp; Analyze Video
        </h1>
        <p className="text-sm text-[#464555] mt-1 max-w-2xl">
          Upload raw footage or live recording. Footage is automatically saved as a draft in your asset library with zero-crop fit ratio simulation.
        </p>
      </div>

      {/* Error Alert */}
      {uploadError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-sm text-red-800 shadow-xs">
          <span className="material-symbols-outlined text-red-500 mt-0.5 shrink-0">error</span>
          <div className="flex-1">
            <strong className="font-semibold block mb-0.5">Notice</strong>
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

      {/* Success Banner */}
      {actionSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-sm text-emerald-800 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
            <span className="font-semibold">{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold px-2 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Grid: Config (Left) & Preview / Simulator (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Project Config & Channels */}
        <div className="lg:col-span-6 space-y-6">
          {/* Metadata Card */}
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
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is the key takeaway or audience angle you want to emphasize?"
                className="w-full px-3.5 py-2.5 bg-white border border-[#c7c4d8] rounded-lg text-sm text-[#131b2e] focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20 outline-none resize-none"
              />
            </div>
          </div>

          {/* Target Distribution Channels Card */}
          <div className="bg-white border border-[#c7c4d8]/70 rounded-xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#4f46e5] text-xl">share</span>
                <h2 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#131b2e]">
                  Target Distribution Channels
                </h2>
              </div>
              <span className="text-[11px] text-[#777587]">Select channel to preview fit</span>
            </div>

            {/* Interactive Channel Selector Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CHANNELS.map((item) => {
                const isSelected = selectedChannelId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedChannelId(item.id);
                      setActiveRatio(item.ratios[0]);
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between space-y-2 cursor-pointer relative ${
                      isSelected
                        ? 'border-[#4f46e5] bg-indigo-50/70 shadow-sm ring-2 ring-[#4f46e5]/20'
                        : 'border-[#c7c4d8]/70 hover:border-[#4f46e5]/60 hover:bg-[#f2f3ff]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`material-symbols-outlined text-xl ${
                            isSelected ? 'text-[#4f46e5]' : 'text-[#777587]'
                          }`}
                        >
                          {item.icon}
                        </span>
                        <span className="font-bold text-xs text-[#131b2e]">{item.name}</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          isSelected
                            ? 'bg-[#4f46e5] text-white'
                            : 'bg-[#eaedff] text-[#4f46e5]'
                        }`}
                      >
                        {item.ratioLabel}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#464555] line-clamp-1">{item.description}</p>

                    {isSelected && (
                      <div className="flex items-center gap-1 text-[10px] text-[#006c49] font-bold">
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                        <span>Active Preview Target</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Ratio Buttons for Selected Platform */}
            <div className="pt-2 border-t border-[#eaedff] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#131b2e] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#4f46e5]">aspect_ratio</span>
                  <span>Fit Ratio Selector:</span>
                </span>
                <span className="text-[10px] text-[#777587]">100% Full Frame (Never Cropped)</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedChannel.ratios.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setActiveRatio(r)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeRatio === r
                        ? 'bg-[#4f46e5] text-white shadow-xs'
                        : 'bg-[#f2f3ff] text-[#464555] hover:bg-[#eaedff] hover:text-[#131b2e]'
                    }`}
                  >
                    <span>{r}</span>
                    <span className="text-[10px] opacity-80">
                      {r === '9:16' ? '(Vertical)' : r === '1:1' ? '(Square)' : '(Landscape)'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Non-Crop Ambient Fit Background Toggle */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-[#464555] font-medium flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#4f46e5]">blur_on</span>
                <span>Aspect Background Fill:</span>
              </span>
              <div className="flex items-center gap-1 bg-[#f2f3ff] p-0.5 rounded-lg border border-[#c7c4d8]/50">
                <button
                  type="button"
                  onClick={() => setFitBackgroundStyle('blur')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                    fitBackgroundStyle === 'blur'
                      ? 'bg-white text-[#4f46e5] shadow-xs'
                      : 'text-[#464555] hover:text-[#131b2e]'
                  }`}
                >
                  Blurred Video Fill
                </button>
                <button
                  type="button"
                  onClick={() => setFitBackgroundStyle('dark')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                    fitBackgroundStyle === 'dark'
                      ? 'bg-white text-[#4f46e5] shadow-xs'
                      : 'text-[#464555] hover:text-[#131b2e]'
                  }`}
                >
                  Studio Black
                </button>
              </div>
            </div>

            {/* Direct Platform Link Launcher */}
            <div className="p-3 bg-[#f8f9ff] border border-[#e2e7ff] rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4f46e5] text-base">link</span>
                <span className="text-[#464555]">
                  Ready to publish? Link directly to <strong>{selectedChannel.name}</strong>:
                </span>
              </div>
              <a
                href={selectedChannel.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white border border-[#c7c4d8] hover:border-[#4f46e5] text-[#4f46e5] hover:bg-[#eaedff]/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <span>{selectedChannel.externalLabel}</span>
                <span className="material-symbols-outlined text-[13px]">open_in_new</span>
              </a>
            </div>
          </div>

          {/* Media Ingest Options: Upload & Live Recording */}
          <div className="bg-white border border-[#c7c4d8]/70 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#4f46e5] text-xl">videocam</span>
                <h2 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#131b2e]">
                  Media Ingest &amp; Recording
                </h2>
              </div>
              <span className="text-[11px] text-[#006c49] font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Auto-saved to Drafts
              </span>
            </div>

            {/* Quick Live Recording Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isRecording}
                onClick={() => handleStartRecording('camera')}
                className="py-2.5 px-3 bg-[#f2f3ff] hover:bg-indigo-50 border border-[#c7c4d8]/60 hover:border-[#4f46e5] rounded-lg text-xs font-semibold text-[#131b2e] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[#ba1a1a] text-lg">videocam</span>
                <span>Record Webcam</span>
              </button>
              <button
                type="button"
                disabled={isRecording}
                onClick={() => handleStartRecording('screen')}
                className="py-2.5 px-3 bg-[#f2f3ff] hover:bg-indigo-50 border border-[#c7c4d8]/60 hover:border-[#4f46e5] rounded-lg text-xs font-semibold text-[#131b2e] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[#4f46e5] text-lg">screen_share</span>
                <span>Record Screen</span>
              </button>
            </div>

            {/* Active Recording Monitor */}
            {isRecording && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-red-600 animate-ping"></span>
                  <div>
                    <p className="text-xs font-bold text-red-900">
                      Recording {recordingType === 'camera' ? 'Webcam' : 'Screen'}...
                    </p>
                    <p className="text-[11px] font-mono text-red-700">
                      Duration: {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">stop_circle</span>
                  <span>Stop &amp; Save Draft</span>
                </button>
              </div>
            )}

            {/* Drag & Drop File Upload */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
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

              <span className="material-symbols-outlined text-3xl text-[#4f46e5] mb-2 block">cloud_upload</span>
              <p className="text-xs font-bold text-[#131b2e]">
                {dragActive ? 'Drop your video file here' : 'Drag & drop video file here or click to browse'}
              </p>
              <p className="text-[11px] text-[#777587] mt-0.5">Supports MP4, MOV, WEBM (Up to 500 MB)</p>

              {/* Upload Progress */}
              {isUploading && (
                <div className="mt-4 max-w-xs mx-auto space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[#131b2e]">
                    <span>Uploading draft to asset library...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#eaedff] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#4f46e5] rounded-full transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Real-Time Platform Preview Simulator */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white border border-[#c7c4d8]/70 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4f46e5] text-xl">preview</span>
                <div>
                  <h2 className="font-['Plus_Jakarta_Sans'] text-base font-bold text-[#131b2e]">
                    Live {selectedChannel.name} Simulator
                  </h2>
                  <p className="text-[11px] text-[#777587]">
                    Ratio: {activeRatio} • Auto-fit Letterbox/Pillarbox
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-[#4f46e5] border border-indigo-200">
                Non-Cropping Engine
              </span>
            </div>

            {/* Simulator Screen Container */}
            <div className="flex items-center justify-center bg-[#0e1322] p-4 sm:p-6 rounded-2xl shadow-inner min-h-[440px]">
              {/* 9:16 Smartphone Preview (TikTok & Reels / YouTube Shorts) */}
              {activeRatio === '9:16' && (
                <div className="w-[260px] sm:w-[280px] aspect-[9/16] rounded-[36px] bg-black border-[7px] border-[#22293d] shadow-2xl relative overflow-hidden flex flex-col justify-between">
                  {/* Smartphone Top Notch & Status Bar */}
                  <div className="absolute top-2 left-0 right-0 z-30 px-5 flex items-center justify-between text-[9px] text-white/90 select-none">
                    <span className="font-semibold">9:41</span>
                    <div className="w-16 h-3.5 bg-black rounded-full mx-auto"></div>
                    <div className="flex items-center gap-1 text-[8px]">
                      <span>5G</span>
                      <span className="material-symbols-outlined text-[10px]">battery_full</span>
                    </div>
                  </div>

                  {/* Video Display: Non-crop Fit Container with Ambient Blurred Background */}
                  <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden bg-black">
                    {/* Blurred Background Layer (Fill) */}
                    {fitBackgroundStyle === 'blur' && videoPreviewUrl && (
                      <video
                        src={videoPreviewUrl}
                        muted
                        autoPlay
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-60 scale-125"
                      />
                    )}

                    {/* Contained Video Layer (100% full frame, NEVER cropped) */}
                    {videoPreviewUrl ? (
                      <video
                        src={videoPreviewUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain relative z-10"
                      />
                    ) : (
                      <div className="text-center p-4 text-white/60 space-y-2 z-10">
                        <span className="material-symbols-outlined text-4xl text-[#4f46e5]">movie_filter</span>
                        <p className="text-xs font-semibold">Upload footage to preview</p>
                      </div>
                    )}
                  </div>

                  {/* Platform Overlay HUD (TikTok / Reels style) */}
                  <div className="relative z-20 pointer-events-none p-3 pb-4 mt-auto flex justify-between items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                    {/* Bottom Creator Info */}
                    <div className="text-white space-y-1 max-w-[190px]">
                      <h4 className="text-xs font-bold drop-shadow">@{user?.username?.toLowerCase().replace(/\s+/g, '') || 'alexmercer'}</h4>
                      <p className="text-[10px] text-white/90 line-clamp-2 drop-shadow leading-snug">
                        {projectName} • AI auto-repurposing preview with non-crop aspect fit! #creator #ai #shorts
                      </p>
                      <div className="flex items-center gap-1 text-[9px] text-white/80">
                        <span className="material-symbols-outlined text-[11px]">music_note</span>
                        <span className="truncate">Original Studio Audio - CreatorAi</span>
                      </div>
                    </div>

                    {/* Right Social Actions Column */}
                    <div className="flex flex-col items-center gap-2.5 text-white text-[9px]">
                      <div className="flex flex-col items-center">
                        <span className="material-symbols-outlined text-lg text-red-500" style={{ fontVariationSettings: "'FILL' 1" }}>
                          favorite
                        </span>
                        <span>24.8K</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="material-symbols-outlined text-lg">mode_comment</span>
                        <span>1.4K</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="material-symbols-outlined text-lg">bookmark</span>
                        <span>580</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="material-symbols-outlined text-lg">share</span>
                        <span>Share</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 1:1 Square Feed Preview (LinkedIn Video / X Square) */}
              {activeRatio === '1:1' && (
                <div className="w-full max-w-[340px] bg-white rounded-xl border border-[#c7c4d8]/80 shadow-xl overflow-hidden text-xs">
                  {/* LinkedIn / Post Header */}
                  <div className="p-3 border-b border-[#eaedff] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#4f46e5] text-white font-bold flex items-center justify-center text-xs">
                        {user?.username?.[0] || 'A'}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#131b2e] text-xs leading-tight">{user?.username || 'Alex Mercer'}</h4>
                        <p className="text-[10px] text-[#777587]">Creator &amp; Video Strategist • 1st</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#4f46e5] font-bold">Follow +</span>
                  </div>

                  {/* Post Caption Preview */}
                  <div className="px-3 pt-2 text-[11px] text-[#131b2e]">
                    <p className="line-clamp-2">
                      {description || 'Transforming 1 long video into 8 high-performing platform assets without harsh crops.'}
                    </p>
                  </div>

                  {/* Video Square Container (1:1 with Non-Crop Fit) */}
                  <div className="relative w-full aspect-square bg-black overflow-hidden flex items-center justify-center my-2">
                    {fitBackgroundStyle === 'blur' && videoPreviewUrl && (
                      <video
                        src={videoPreviewUrl}
                        muted
                        autoPlay
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-60 scale-125"
                      />
                    )}
                    {videoPreviewUrl ? (
                      <video
                        src={videoPreviewUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain relative z-10"
                      />
                    ) : (
                      <div className="text-center p-4 text-white/60 space-y-1 z-10">
                        <span className="material-symbols-outlined text-3xl text-[#4f46e5]">videocam</span>
                        <p className="text-xs font-semibold">1:1 Square Video Preview</p>
                      </div>
                    )}
                  </div>

                  {/* Social Action Footer */}
                  <div className="px-3 py-2 border-t border-[#eaedff] flex items-center justify-between text-[#464555] text-[11px]">
                    <span className="flex items-center gap-1 font-semibold hover:text-[#4f46e5] cursor-pointer">
                      <span className="material-symbols-outlined text-sm">thumb_up</span>
                      <span>Like (342)</span>
                    </span>
                    <span className="flex items-center gap-1 font-semibold hover:text-[#4f46e5] cursor-pointer">
                      <span className="material-symbols-outlined text-sm">chat_bubble</span>
                      <span>Comment (58)</span>
                    </span>
                    <span className="flex items-center gap-1 font-semibold hover:text-[#4f46e5] cursor-pointer">
                      <span className="material-symbols-outlined text-sm">repeat</span>
                      <span>Repost</span>
                    </span>
                  </div>
                </div>
              )}

              {/* 16:9 Landscape Preview (X / Twitter / LinkedIn Landscape) */}
              {activeRatio === '16:9' && (
                <div className="w-full max-w-[420px] bg-white rounded-xl border border-[#c7c4d8]/80 shadow-xl overflow-hidden text-xs">
                  {/* X / Twitter Post Header */}
                  <div className="p-3 border-b border-[#eaedff] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#131b2e] text-white font-bold flex items-center justify-center text-xs">
                        X
                      </div>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-[#131b2e] text-xs">{user?.username || 'Alex Mercer'}</span>
                          <span className="text-[10px] text-[#777587]">@{user?.username?.toLowerCase().replace(/\s+/g, '') || 'alexmercer'}</span>
                        </div>
                        <p className="text-[10px] text-[#777587]">Multi-Channel Video Release</p>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-sm text-[#777587]">more_horiz</span>
                  </div>

                  {/* Post Caption */}
                  <div className="px-3 pt-2 text-[11px] text-[#131b2e]">
                    <p className="line-clamp-2">
                      {projectName}: {description}
                    </p>
                  </div>

                  {/* 16:9 Landscape Video Container */}
                  <div className="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center my-2">
                    {videoPreviewUrl ? (
                      <video
                        src={videoPreviewUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-4 text-white/60 space-y-1">
                        <span className="material-symbols-outlined text-3xl text-[#4f46e5]">movie</span>
                        <p className="text-xs font-semibold">16:9 Landscape Player</p>
                      </div>
                    )}
                  </div>

                  {/* Metrics Bar */}
                  <div className="px-3 py-2 border-t border-[#eaedff] flex items-center justify-between text-[#777587] text-[11px]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">chat_bubble_outline</span>
                      <span>42</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">repeat</span>
                      <span>128</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">favorite_border</span>
                      <span>890</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">bar_chart</span>
                      <span>18.4K Views</span>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Video File Specs */}
            {project.sourceVideo && (
              <div className="p-3 bg-[#f8f9ff] border border-[#eaedff] rounded-xl flex items-center justify-between text-xs text-[#464555]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006c49] text-base">check_circle</span>
                  <span className="font-semibold text-[#131b2e] truncate max-w-[200px]">
                    {project.sourceVideo.filename}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[#777587]">
                  {project.sourceVideo.width || 1920}x{project.sourceVideo.height || 1080} • {Math.round(project.sourceVideo.duration || 15)}s
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar with Direct Link & Submit */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#c7c4d8]/80 py-4 px-4 sm:px-8 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-4 py-2 text-xs font-semibold text-[#464555] hover:text-[#131b2e] rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => onNavigate('assets')}
              className="px-3.5 py-2 text-xs font-semibold text-[#4f46e5] hover:bg-[#f2f3ff] rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">folder</span>
              <span>View Drafts in Assets</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Direct Platform Link */}
            <a
              href={selectedChannel.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 bg-white border border-[#c7c4d8] hover:border-[#4f46e5] text-[#131b2e] text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Open platform upload page"
            >
              <span>{selectedChannel.externalLabel}</span>
              <span className="material-symbols-outlined text-sm text-[#4f46e5]">open_in_new</span>
            </a>

            {/* 1. Save Draft */}
            <button
              onClick={handleSaveDraft}
              disabled={isUploading || isRecording}
              className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs active:scale-[0.98]"
              title="Save footage & project as Draft in Asset Library"
            >
              <span className="material-symbols-outlined text-base text-amber-700">bookmark_border</span>
              <span>Save Draft</span>
            </button>

            {/* 2. Share Video */}
            <button
              onClick={handleShareVideo}
              disabled={isUploading || isRecording}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs active:scale-[0.98]"
              title="Publish and share video to your profile"
            >
              <span className="material-symbols-outlined text-base text-blue-700">share</span>
              <span>Share Video</span>
            </button>

            {/* 3. Analyze with Google Gemini */}
            <button
              onClick={handleAnalyzeWithGemini}
              disabled={isUploading || isRecording}
              className="bg-[#4f46e5] hover:bg-[#3525cd] text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              title="Transcribe & extract viral clips with Google Gemini"
            >
              <span>Analyze with Google Gemini</span>
              <span className="material-symbols-outlined text-base">auto_awesome</span>
            </button>
          </div>
        </div>
      </div>

      {/* Share Video Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#c7c4d8]/70 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#eaedff]">
              <div className="flex items-center gap-2 text-blue-600">
                <span className="material-symbols-outlined text-2xl">share</span>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-base text-[#131b2e]">Share Video</h3>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-[#777587] hover:text-[#131b2e] cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <p className="text-xs text-[#464555]">
              This video has been marked as <strong>Shared</strong> and is now viewable in your <strong>Creator Profile</strong> and under <strong>Shared Videos</strong> in your Asset Library!
            </p>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-[#131b2e]">Public Video Link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}${videoPreviewUrl || '/api/media/sample_podcast_ep14.mp4'}`}
                  className="flex-1 bg-[#f2f3ff] border border-[#c7c4d8] rounded-lg px-3 py-2 text-xs font-mono text-[#131b2e] outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}${videoPreviewUrl || '/api/media/sample_podcast_ep14.mp4'}`);
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 3000);
                  }}
                  className="px-3 py-2 bg-[#4f46e5] text-white rounded-lg text-xs font-semibold hover:bg-[#3525cd] transition-all cursor-pointer shrink-0"
                >
                  {shareCopied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#eaedff]">
              <button
                onClick={() => {
                  setShowShareModal(false);
                  onNavigate('assets');
                }}
                className="px-4 py-2 bg-[#f2f3ff] hover:bg-[#eaedff] text-[#4f46e5] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                View Shared in Assets
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
