export type ScreenId = 
  | 'home'
  | 'login'
  | 'create_project'
  | 'dashboard'
  | 'analytics'
  | 'export'
  | 'repurpose'
  | 'adapt'
  | 'workflow'
  | 'assets'
  | 'suggestions'
  | 'clip_editor'
  | 'transcript'
  | 'hooks'
  | 'captions'
  | 'processing'
  | 'ai_progress';

export type NavTab = 'Home' | 'Projects' | 'Assets' | 'AI Tools' | 'Workflow' | 'Analytics' | 'Settings';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface CreatorStats {
  totalProjects: number;
  totalAssets: number;
  totalRawVideos: number;
  totalClips: number;
  totalExports: number;
  totalHooksGenerated: number;
  totalCaptionsGenerated: number;
  totalStorageBytes: number;
  totalStorageMB: number;
  totalVideoMinutes: number;
}

export interface Project {
  id: string;
  title: string;
  name?: string;
  description: string;
  duration?: string;
  status: 'draft' | 'processing' | 'ready' | 'exported' | 'Editing' | 'Ready' | 'Published';
  updatedAt: string;
  createdAt?: string;
  thumbnail?: string;
}

export interface SuggestedClip {
  id: string;
  clipNumber?: string;
  title: string;
  hook?: string;
  reason?: string;
  timeRange?: string;
  durationSeconds?: number;
  aiHookScore?: number; // Clear AI estimation metric (formerly viralScore/retentionScore)
  viralScore?: number;
  retentionScore?: number;
  completionRate?: string;
  retentionCategory?: string;
  statusBadge?: string;
  predictedReach?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  startTime?: string | number;
  endTime?: string | number;
  duration?: string | number;
  transcriptSnippet?: string;
  viralReason?: string;
  aspectRatio?: string[];
  tags?: string[];
  url?: string;
  filename?: string;
}

export interface GeneratedHook {
  id: string;
  quote?: string;
  explanation?: string;
  score?: number;
  aiHookScore?: number; // Clear AI estimation metric
  type?: string;
  words?: number;
  isTopRecommended?: boolean;
  style?: string;
  hookText?: string;
  retentionProjection?: number;
  category?: string;
  characterCount?: number;
}

export interface Asset {
  id: string;
  name: string;
  type: 'video' | 'clip' | 'transcript' | 'image' | 'audio';
  size: string;
  duration?: string;
  resolution?: string;
  aspect?: string;
  thumbnail?: string;
  tags: string[];
  updatedAt: string;
  metadata?: string;
  previewUrl?: string;
  url?: string;
  filename?: string;
  fileSize?: number;
}

export interface WorkflowCard {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryClass: string;
  format?: string;
  formatIcon?: string;
  status?: string;
  statusClass?: string;
  tags?: string[];
  avatars?: string[];
  avatar?: string;
  columnId?: string;
  time?: string;
  metric?: string;
  formatsCount?: string;
  progress?: number;
  views?: string;
  retention?: string;
  engagement?: string;
}
