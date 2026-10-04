-- CreatorAi Database Schema for Supabase PostgreSQL
-- Enable uuid-ossp for unique ID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked to Supabase Auth users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Assets Table
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  original_name TEXT NOT NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  asset_type TEXT NOT NULL, -- 'video' | 'clip' | 'audio' | 'transcript' | 'image'
  duration NUMERIC,
  width INTEGER,
  height INTEGER,
  fps NUMERIC,
  has_audio BOOLEAN DEFAULT TRUE,
  aspect TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets"
  ON assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own assets"
  ON assets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets"
  ON assets FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Clips Table
CREATE TABLE IF NOT EXISTS clips (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  source_asset_id TEXT REFERENCES assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time NUMERIC NOT NULL,
  end_time NUMERIC NOT NULL,
  duration NUMERIC NOT NULL,
  generated_asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
  ai_hook_score NUMERIC,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own clips"
  ON clips FOR ALL
  USING (auth.uid() = user_id);

-- 5. Transcripts Table
CREATE TABLE IF NOT EXISTS transcripts (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  segments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own transcripts"
  ON transcripts FOR ALL
  USING (auth.uid() = user_id);

-- 6. Hooks Table
CREATE TABLE IF NOT EXISTS hooks (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  clip_id TEXT REFERENCES clips(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  style TEXT NOT NULL,
  ai_score_if_used NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own hooks"
  ON hooks FOR ALL
  USING (auth.uid() = user_id);

-- 7. Captions Table
CREATE TABLE IF NOT EXISTS captions (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  clip_id TEXT REFERENCES clips(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  text TEXT NOT NULL,
  hashtags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE captions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own captions"
  ON captions FOR ALL
  USING (auth.uid() = user_id);
