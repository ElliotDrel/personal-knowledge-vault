-- Migration: Create ai_processing_logs table
-- Date: 2025-10-17
-- Description: General-purpose table for tracking all AI operations (notes check, summarization, etc.)
--              Supports retry chains via self-referential parent_log_id and flexible JSONB data storage.

-- Create ai_processing_logs table
CREATE TABLE ai_processing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_log_id UUID REFERENCES ai_processing_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,

  action_type TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed', 'partial_success')),

  model_used TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  error_details JSONB,
  processing_time_ms INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX idx_ai_logs_user ON ai_processing_logs(user_id);
CREATE INDEX idx_ai_logs_resource ON ai_processing_logs(resource_id);
CREATE INDEX idx_ai_logs_parent ON ai_processing_logs(parent_log_id);
CREATE INDEX idx_ai_logs_action_type ON ai_processing_logs(action_type);
CREATE INDEX idx_ai_logs_status ON ai_processing_logs(status, created_at);

-- Updated_at trigger
CREATE TRIGGER set_ai_logs_updated_at
  BEFORE UPDATE ON ai_processing_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE ai_processing_logs IS 'Tracks all AI processing operations (notes check, summarization, etc.) with retry chain support';
COMMENT ON COLUMN ai_processing_logs.action_type IS 'Type of AI operation: notes_check, summary_generation, etc.';
COMMENT ON COLUMN ai_processing_logs.parent_log_id IS 'Links retry attempts to original run for debugging';
COMMENT ON COLUMN ai_processing_logs.attempt_number IS '1 for initial attempt, increments for retries';
COMMENT ON COLUMN ai_processing_logs.status IS 'Lifecycle: processing -> completed/failed/partial_success';
COMMENT ON COLUMN ai_processing_logs.input_data IS 'Flexible JSONB for operation-specific input (notes, metadata, etc.)';
COMMENT ON COLUMN ai_processing_logs.output_data IS 'Flexible JSONB for operation-specific output (comments created, tokens used, etc.)';
COMMENT ON COLUMN ai_processing_logs.error_details IS 'Flexible JSONB for error context when status=failed';
COMMENT ON COLUMN ai_processing_logs.processing_time_ms IS 'Total processing duration in milliseconds';

-- Validation query (run after migration to verify):
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'ai_processing_logs'
-- ORDER BY ordinal_position;
--
-- Expected: 12 columns (id, parent_log_id, user_id, resource_id, action_type,
--           attempt_number, status, model_used, 4 data fields, 2 timestamps)
