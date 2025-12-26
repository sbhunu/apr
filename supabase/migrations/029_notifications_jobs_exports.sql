-- Migration: Notifications, Jobs, Exports, File Versions, Audit Events
-- Adds supporting tables for notifications, background jobs, exports and file versioning

-- Notifications
CREATE TABLE IF NOT EXISTS apr.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON apr.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON apr.notifications(created_at DESC);

-- Jobs
CREATE TABLE IF NOT EXISTS apr.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','failed','completed')),
  attempts INT DEFAULT 0,
  last_error TEXT,
  run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON apr.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_run_at ON apr.jobs(run_at);

-- Exports
CREATE TABLE IF NOT EXISTS apr.exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL,
  type TEXT NOT NULL,
  params JSONB DEFAULT '{}'::jsonb,
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exports_user_id ON apr.exports(user_id);

-- File versions
CREATE TABLE IF NOT EXISTS apr.file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL,
  version INT NOT NULL DEFAULT 1,
  storage_path TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  uploaded_by UUID,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON apr.file_versions(file_id);

-- Audit Events
CREATE TABLE IF NOT EXISTS apr.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  actor_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON apr.audit_events(entity_type, entity_id);

-- Row level security: allow users to read their notifications
ALTER TABLE apr.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON apr.notifications FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Users can insert notifications" ON apr.notifications FOR INSERT
  WITH CHECK (true);

-- Jobs RLS: only service role should insert/update via server-side clients; allow select for admins
ALTER TABLE apr.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view jobs" ON apr.jobs FOR SELECT
  USING (EXISTS (SELECT 1 FROM apr.user_profiles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Service can insert jobs" ON apr.jobs FOR INSERT
  WITH CHECK (true);

-- updated_at trigger for jobs and exports
CREATE OR REPLACE FUNCTION apr.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_touch_jobs_updated_at
  BEFORE UPDATE ON apr.jobs
  FOR EACH ROW
  EXECUTE FUNCTION apr.touch_updated_at();

CREATE TRIGGER trigger_touch_exports_updated_at
  BEFORE UPDATE ON apr.exports
  FOR EACH ROW
  EXECUTE FUNCTION apr.touch_updated_at();
