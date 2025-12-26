/**
 * Workflow Events Table
 * Tracks cross-module workflow triggers as per Integrated Plan BPMN
 */

-- Create workflow events table
CREATE TABLE IF NOT EXISTS apr.workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_module TEXT NOT NULL,
  to_module TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('planning_approved', 'survey_sealed', 'scheme_registered', 'title_registered')),
  triggered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  triggered_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processed', 'failed')),
  processed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_workflow_events_entity ON apr.workflow_events(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_workflow_events_status ON apr.workflow_events(status);
CREATE INDEX IF NOT EXISTS idx_workflow_events_trigger_type ON apr.workflow_events(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflow_events_from_module ON apr.workflow_events(from_module);
CREATE INDEX IF NOT EXISTS idx_workflow_events_to_module ON apr.workflow_events(to_module);
CREATE INDEX IF NOT EXISTS idx_workflow_events_triggered_at ON apr.workflow_events(triggered_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION apr.update_workflow_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_events_updated_at
  BEFORE UPDATE ON apr.workflow_events
  FOR EACH ROW
  EXECUTE FUNCTION apr.update_workflow_events_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON apr.workflow_events TO authenticated;
GRANT SELECT ON apr.workflow_events TO anon;

-- Create public view for workflow events
DROP VIEW IF EXISTS public.workflow_events;
CREATE VIEW public.workflow_events AS
SELECT 
  id,
  from_module,
  to_module,
  entity_id,
  entity_type,
  trigger_type,
  triggered_at,
  triggered_by,
  metadata,
  status,
  processed_at,
  error,
  created_at,
  updated_at
FROM apr.workflow_events;

GRANT SELECT ON public.workflow_events TO authenticated;
GRANT SELECT ON public.workflow_events TO anon;

-- Add comment
COMMENT ON TABLE apr.workflow_events IS 'Tracks cross-module workflow triggers as per Integrated Plan BPMN. Documents workflow handoffs between Planning → Survey → Deeds → Operations modules.';

