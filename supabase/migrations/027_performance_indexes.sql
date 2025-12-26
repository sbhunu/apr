-- Migration: Performance Indexes
-- Creates additional indexes for query optimization

-- Indexes for frequently queried columns

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role 
  ON apr.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status 
  ON apr.user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at 
  ON apr.user_profiles(created_at DESC);

-- Planning indexes
CREATE INDEX IF NOT EXISTS idx_sectional_scheme_plans_status 
  ON apr.sectional_scheme_plans(status);
CREATE INDEX IF NOT EXISTS idx_sectional_scheme_plans_planner_id 
  ON apr.sectional_scheme_plans(planner_id);
CREATE INDEX IF NOT EXISTS idx_sectional_scheme_plans_created_at 
  ON apr.sectional_scheme_plans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sectional_scheme_plans_locked 
  ON apr.sectional_scheme_plans(locked) WHERE locked = true;

-- Survey indexes
CREATE INDEX IF NOT EXISTS idx_survey_sectional_plans_status 
  ON apr.survey_sectional_plans(status);
CREATE INDEX IF NOT EXISTS idx_survey_sectional_plans_surveyor_id 
  ON apr.survey_sectional_plans(surveyor_id);
CREATE INDEX IF NOT EXISTS idx_survey_sectional_plans_planning_plan_id 
  ON apr.survey_sectional_plans(planning_plan_id);
CREATE INDEX IF NOT EXISTS idx_survey_sectional_plans_sealed_at 
  ON apr.survey_sectional_plans(sealed_at DESC) WHERE sealed_at IS NOT NULL;

-- Deeds indexes
CREATE INDEX IF NOT EXISTS idx_sectional_schemes_scheme_number 
  ON apr.sectional_schemes(scheme_number);
CREATE INDEX IF NOT EXISTS idx_sectional_schemes_registration_date 
  ON apr.sectional_schemes(registration_date DESC);
CREATE INDEX IF NOT EXISTS idx_sections_scheme_id 
  ON apr.sections(scheme_id);
CREATE INDEX IF NOT EXISTS idx_sections_section_number 
  ON apr.sections(section_number);
CREATE INDEX IF NOT EXISTS idx_sectional_titles_title_number 
  ON apr.sectional_titles(title_number);
CREATE INDEX IF NOT EXISTS idx_sectional_titles_registration_status 
  ON apr.sectional_titles(registration_status);
CREATE INDEX IF NOT EXISTS idx_sectional_titles_registration_date 
  ON apr.sectional_titles(registration_date DESC);
CREATE INDEX IF NOT EXISTS idx_sectional_titles_holder_name 
  ON apr.sectional_titles(holder_name);

-- Operations indexes
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_title_id 
  ON apr.ownership_transfers(title_id);
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_status 
  ON apr.ownership_transfers(status);
CREATE INDEX IF NOT EXISTS idx_ownership_transfers_effective_date 
  ON apr.ownership_transfers(effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_mortgages_title_id 
  ON apr.mortgages(title_id);
CREATE INDEX IF NOT EXISTS idx_mortgages_status 
  ON apr.mortgages(status);
CREATE INDEX IF NOT EXISTS idx_mortgages_priority 
  ON apr.mortgages(priority);

-- Audit and admin indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id 
  ON apr.user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action 
  ON apr.user_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_timestamp 
  ON apr.user_activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_verification_history_title_id 
  ON apr.verification_history(title_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_verified_at 
  ON apr.verification_history(verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_history_fraud_detected 
  ON apr.verification_history(fraud_detected) WHERE fraud_detected = true;

-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_workflow_state_entity_type 
  ON apr.workflow_state(entity_type);
CREATE INDEX IF NOT EXISTS idx_workflow_state_current_state 
  ON apr.workflow_state(current_state);
CREATE INDEX IF NOT EXISTS idx_workflow_history_entity_id 
  ON apr.workflow_history(entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_transitioned_at 
  ON apr.workflow_history(transitioned_at DESC);

-- Composite indexes for common query patterns

-- Planning: Get pending schemes for review
CREATE INDEX IF NOT EXISTS idx_sectional_scheme_plans_status_created 
  ON apr.sectional_scheme_plans(status, created_at DESC) 
  WHERE status IN ('submitted', 'under_review');

-- Survey: Get surveys pending sealing
CREATE INDEX IF NOT EXISTS idx_survey_sectional_plans_status_reviewed 
  ON apr.survey_sectional_plans(status, reviewed_at DESC) 
  WHERE status = 'under_review';

-- Deeds: Get registered titles by holder
CREATE INDEX IF NOT EXISTS idx_sectional_titles_status_holder 
  ON apr.sectional_titles(registration_status, holder_name) 
  WHERE registration_status = 'registered';

-- Operations: Get active mortgages by title
CREATE INDEX IF NOT EXISTS idx_mortgages_title_status_priority 
  ON apr.mortgages(title_id, status, priority) 
  WHERE status = 'active';

-- Comments
COMMENT ON INDEX idx_sectional_scheme_plans_status_created IS 'Optimizes queries for pending planning reviews';
COMMENT ON INDEX idx_survey_sectional_plans_status_reviewed IS 'Optimizes queries for surveys pending sealing';
COMMENT ON INDEX idx_sectional_titles_status_holder IS 'Optimizes queries for registered titles by holder';
COMMENT ON INDEX idx_mortgages_title_status_priority IS 'Optimizes queries for active mortgages by priority';

