import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Project, SuggestedClip, GeneratedHook, Asset, UserProfile, CreatorStats } from '../types';

export interface ActiveProjectState {
  id: string;
  name: string;
  sourceVideo?: {
    filename: string;
    url: string;
    duration: number;
    width: number;
    height: number;
    size: number;
    mimeType: string;
  };
  suggestedClips: SuggestedClip[];
  selectedClip?: SuggestedClip;
  generatedHooks: GeneratedHook[];
  selectedHook?: GeneratedHook;
  transcript: string;
  generatedClips: Array<{
    id: string;
    title: string;
    url: string;
    filename: string;
    duration: number;
    aspect?: string;
  }>;
  exportedVideos: Array<{
    id: string;
    name: string;
    url: string;
    downloadUrl: string;
    filename: string;
    aspect: string;
  }>;
  status: 'draft' | 'processing' | 'ready' | 'exported';
  targetPlatform?: 'instagram' | 'shorts' | 'linkedin' | 'x' | 'tiktok';
  selectedCaption?: string;
}

interface ProjectContextType {
  // Auth state
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;

  // Projects & Data state
  projects: Project[];
  project: ActiveProjectState;
  selectedClip?: SuggestedClip;
  creatorStats: CreatorStats | null;
  realAssets: Asset[];
  isLoadingAssets: boolean;

  // Actions
  updateProject: (updates: Partial<ActiveProjectState>) => void;
  createProject: (name: string, description?: string) => Promise<Project>;
  selectProject: (projectId: string) => Promise<void>;
  setSourceVideo: (video: ActiveProjectState['sourceVideo']) => void;
  setSuggestedClips: (clips: SuggestedClip[]) => void;
  setSelectedClip: (clip: SuggestedClip) => void;
  setGeneratedHooks: (hooks: GeneratedHook[]) => void;
  setSelectedHook: (hook: GeneratedHook) => void;
  setTranscript: (text: string) => void;
  setTargetPlatform: (platform: any) => void;
  setSelectedCaption: (caption: string) => void;
  addGeneratedClip: (clip: ActiveProjectState['generatedClips'][0]) => void;
  addExportedVideo: (video: ActiveProjectState['exportedVideos'][0]) => void;
  refreshAssets: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

const DEFAULT_PROJECT_STATE: ActiveProjectState = {
  id: 'proj_default',
  name: 'AI Video Strategy & Repurposing',
  sourceVideo: {
    filename: 'sample_podcast_ep14.mp4',
    url: '/api/media/sample_podcast_ep14.mp4',
    duration: 15,
    width: 1920,
    height: 1080,
    size: 2400000,
    mimeType: 'video/mp4',
  },
  suggestedClips: [],
  generatedHooks: [],
  transcript: '',
  generatedClips: [],
  exportedVideos: [],
  status: 'ready',
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Auth State
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('creatorai_auth_token'));
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('creatorai_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 2. Project State
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<ActiveProjectState>(() => {
    try {
      const saved = localStorage.getItem('creatorai_active_project');
      if (!saved) return DEFAULT_PROJECT_STATE;
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_PROJECT_STATE,
        ...parsed,
        suggestedClips: Array.isArray(parsed?.suggestedClips) ? parsed.suggestedClips : [],
        generatedHooks: Array.isArray(parsed?.generatedHooks) ? parsed.generatedHooks : [],
        generatedClips: Array.isArray(parsed?.generatedClips) ? parsed.generatedClips : [],
        exportedVideos: Array.isArray(parsed?.exportedVideos) ? parsed.exportedVideos : [],
      };
    } catch {
      return DEFAULT_PROJECT_STATE;
    }
  });

  const [creatorStats, setCreatorStats] = useState<CreatorStats | null>(null);
  const [realAssets, setRealAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Sync active project to localStorage cache
  useEffect(() => {
    try {
      localStorage.setItem('creatorai_active_project', JSON.stringify(project));
    } catch (e) {
      console.warn('Could not persist project state to localStorage:', e);
    }
  }, [project]);

  // Auth headers helper
  const getAuthHeaders = useCallback((): HeadersInit => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

  // Refresh assets from backend
  const refreshAssets = useCallback(async () => {
    setIsLoadingAssets(true);
    try {
      const res = await fetch('/api/assets', { credentials: 'omit', headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const mapped: Asset[] = (data.assets || []).map((a: any) => ({
          id: a.id,
          name: a.name || a.filename,
          type: a.assetType || (a.filename.includes('clip') ? 'clip' : 'video'),
          size: `${Math.round(((a.fileSize || 0) / (1024 * 1024)) * 10) / 10} MB`,
          duration: a.duration ? `${Math.round(a.duration)}s` : '15s',
          aspect: a.aspect || (a.width && a.height ? `${a.width}:${a.height}` : '16:9'),
          resolution: a.width && a.height ? `${a.width}x${a.height}` : '1080p',
          tags: a.assetType === 'clip' ? ['AI Clip', 'Short'] : ['Raw Footage', 'Master'],
          updatedAt: new Date(a.createdAt || Date.now()).toLocaleDateString(),
          previewUrl: a.url || `/api/media/${a.filename}`,
          url: a.url || `/api/media/${a.filename}`,
          thumbnail: a.thumbnail || a.thumbnailUrl || undefined,
          filename: a.filename,
          fileSize: a.fileSize,
        }));
        setRealAssets(mapped);
      }
    } catch (err) {
      console.warn('Could not fetch real assets:', err);
    } finally {
      setIsLoadingAssets(false);
    }
  }, [getAuthHeaders]);

  // Refresh projects from backend
  const refreshProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const mapped: Project[] = (data.projects || []).map((p: any) => ({
          id: p.id,
          title: p.name,
          name: p.name,
          description: p.description || 'CreatorAi Video Project',
          duration: '15s',
          status: p.status || 'ready',
          updatedAt: new Date(p.updatedAt || Date.now()).toLocaleDateString(),
          createdAt: p.createdAt,
          thumbnail: p.thumbnail || undefined,
        }));
        setProjects(mapped);
      }
    } catch (err) {
      console.warn('Could not fetch projects:', err);
    }
  }, [getAuthHeaders]);

  // Refresh creator true statistics
  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch('/api/creator/stats', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCreatorStats(data.stats);
      }
    } catch (err) {
      console.warn('Could not fetch creator stats:', err);
    }
  }, [getAuthHeaders]);

  // Initial authentication check & data hydration
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setUser(data.user);
              localStorage.setItem('creatorai_user', JSON.stringify(data.user));
            } else {
              setToken(null);
              setUser(null);
              localStorage.removeItem('creatorai_auth_token');
              localStorage.removeItem('creatorai_user');
            }
          }
        } catch {
          // Keep existing cached user if offline
        }
      }
      refreshProjects();
      refreshAssets();
      refreshStats();
    };

    initAuth();
  }, [token, refreshProjects, refreshAssets, refreshStats]);

  // Authentication Handlers
  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || 'Login failed. Please check credentials.');
    }

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('creatorai_auth_token', data.token);
    localStorage.setItem('creatorai_user', JSON.stringify(data.user));

    await Promise.all([refreshProjects(), refreshAssets(), refreshStats()]);
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || 'Registration failed.');
    }

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('creatorai_auth_token', data.token);
    localStorage.setItem('creatorai_user', JSON.stringify(data.user));

    await Promise.all([refreshProjects(), refreshAssets(), refreshStats()]);
  };

  const logout = () => {
    if (token) {
      fetch('/api/auth/logout', { method: 'POST', headers: getAuthHeaders() }).catch(() => {});
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('creatorai_auth_token');
    localStorage.removeItem('creatorai_user');
    setProjects([]);
    setRealAssets([]);
    setCreatorStats(null);
  };

  // Project Actions
  const updateProject = (updates: Partial<ActiveProjectState>) => {
    setProject((prev) => {
      const next = { ...prev, ...updates };
      // Sync to backend if name changed
      if (updates.name && updates.name !== prev.name) {
        fetch('/api/projects', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ id: next.id, name: next.name }),
        }).catch(() => {});
      }
      return next;
    });
  };

  const createProject = async (name: string, description?: string): Promise<Project> => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, description }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error?.message || 'Failed to create project.');
    }

    const newProj = data.project;
    const newActiveState: ActiveProjectState = {
      id: newProj.id,
      name: newProj.name,
      suggestedClips: [],
      generatedHooks: [],
      transcript: '',
      generatedClips: [],
      exportedVideos: [],
      status: 'draft',
    };

    setProject((prev) => ({
      ...newActiveState,
      sourceVideo: prev.sourceVideo,
    }));
    await refreshProjects();
    await refreshStats();

    return {
      id: newProj.id,
      title: newProj.name,
      name: newProj.name,
      description: newProj.description || '',
      status: 'draft',
      updatedAt: new Date().toLocaleDateString(),
    };
  };

  const selectProject = async (projectId: string) => {
    try {
      const res = await fetch('/api/projects', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const found = (data.projects || []).find((p: any) => p.id === projectId);
        if (found) {
          // Fetch associated assets for this project
          const assetsRes = await fetch(`/api/assets?projectId=${projectId}`, { headers: getAuthHeaders() });
          let sourceVideo: ActiveProjectState['sourceVideo'] | undefined = undefined;
          if (assetsRes.ok) {
            const assetsData = await assetsRes.json();
            const projectAssets = assetsData.assets || [];
            const videoAsset = projectAssets.find((a: any) => a.projectId === projectId && a.assetType === 'video') ||
                               projectAssets.find((a: any) => a.assetType === 'video');
            if (videoAsset) {
              sourceVideo = {
                filename: videoAsset.filename,
                url: videoAsset.url || `/api/media/${videoAsset.filename}`,
                duration: videoAsset.duration || 15,
                width: videoAsset.width || 1920,
                height: videoAsset.height || 1080,
                size: videoAsset.fileSize || 2400000,
                mimeType: videoAsset.mimeType || 'video/mp4',
              };
            }
          }

          // Fetch transcript for this project
          const transRes = await fetch(`/api/transcripts/${projectId}`, { headers: getAuthHeaders() });
          let transcriptText = '';
          if (transRes.ok) {
            const transData = await transRes.json();
            if (transData.transcript?.transcript) {
              transcriptText = transData.transcript.transcript;
            }
          }

          setProject((prev) => ({
            ...prev,
            id: found.id,
            name: found.name,
            status: found.status || 'ready',
            sourceVideo: sourceVideo || prev.sourceVideo,
            transcript: transcriptText || prev.transcript,
          }));
        }
      }
    } catch (err) {
      console.warn('Error selecting project:', err);
    }
  };

  const setSourceVideo = (video: ActiveProjectState['sourceVideo']) => {
    setProject((prev) => ({
      ...prev,
      sourceVideo: video,
      status: 'ready',
    }));
    refreshStats();
  };

  const setSuggestedClips = (clips: SuggestedClip[]) => {
    setProject((prev) => ({ ...prev, suggestedClips: clips }));
  };

  const setSelectedClip = (clip: SuggestedClip) => {
    setProject((prev) => ({ ...prev, selectedClip: clip }));
  };

  const setGeneratedHooks = (hooks: GeneratedHook[]) => {
    setProject((prev) => ({ ...prev, generatedHooks: hooks }));
    refreshStats();
  };

  const setSelectedHook = (hook: GeneratedHook) => {
    setProject((prev) => ({ ...prev, selectedHook: hook }));
  };

  const setTranscript = (text: string) => {
    setProject((prev) => ({ ...prev, transcript: text }));
    // Persist transcript to server
    if (project.id) {
      fetch('/api/transcripts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ projectId: project.id, transcript: text }),
      }).catch(() => {});
    }
  };

  const setTargetPlatform = (platform: any) => {
    setProject((prev) => ({ ...prev, targetPlatform: platform }));
  };

  const setSelectedCaption = (caption: string) => {
    setProject((prev) => ({ ...prev, selectedCaption: caption }));
  };

  const addGeneratedClip = (clip: ActiveProjectState['generatedClips'][0]) => {
    setProject((prev) => ({
      ...prev,
      generatedClips: [clip, ...(prev.generatedClips || []).filter((c) => c.id !== clip.id)],
    }));
    refreshStats();
  };

  const addExportedVideo = (video: ActiveProjectState['exportedVideos'][0]) => {
    setProject((prev) => ({
      ...prev,
      exportedVideos: [video, ...(prev.exportedVideos || []).filter((v) => v.id !== video.id)],
      status: 'exported',
    }));
    refreshStats();
  };

  return (
    <ProjectContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token || !!user,
        login,
        register,
        logout,
        projects,
        project,
        selectedClip: project.selectedClip,
        creatorStats,
        realAssets,
        isLoadingAssets,
        updateProject,
        createProject,
        selectProject,
        setSourceVideo,
        setSuggestedClips,
        setSelectedClip,
        setGeneratedHooks,
        setSelectedHook,
        setTranscript,
        setTargetPlatform,
        setSelectedCaption,
        addGeneratedClip,
        addExportedVideo,
        refreshAssets,
        refreshProjects,
        refreshStats,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
