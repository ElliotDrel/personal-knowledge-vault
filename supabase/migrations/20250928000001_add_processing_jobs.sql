-- Migration: Add processing_jobs table for short-form video processing
-- Description: Creates table to track async processing jobs with proper indexing and RLS

-- Create processing_jobs table
CREATE TABLE processing_jobs (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- URL information
    original_url TEXT NOT NULL,
    normalized_url TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'youtube-short', 'instagram-reel')),

    -- Processing status
    status TEXT NOT NULL DEFAULT 'created' CHECK (
        status IN ('created', 'detecting', 'metadata', 'transcript', 'completed', 'failed', 'unsupported')
    ),
    current_step TEXT CHECK (
        current_step IN ('url_validation', 'platform_detection', 'metadata_extraction', 'transcript_extraction', 'data_normalization', 'completion')
    ),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),

    -- Error handling
    error_code TEXT CHECK (
        error_code IN ('invalid_url', 'unsupported_platform', 'unsupported_content', 'privacy_blocked',
                      'not_found', 'quota_exceeded', 'api_error', 'rate_limited', 'extraction_failed',
                      'transcript_failed', 'internal_error')
    ),
    error_message TEXT,
    error_details TEXT,
    retry_after_ms INTEGER,

    -- Processing results
    metadata_json JSONB,
    transcript TEXT,
    warnings TEXT[] DEFAULT '{}',

    -- API metadata
    api_version TEXT,
    extraction_method TEXT DEFAULT 'auto' CHECK (extraction_method IN ('auto', 'manual')),

    -- Polling control
    poll_count INTEGER DEFAULT 0,
    max_poll_count INTEGER DEFAULT 150,
    poll_interval_ms INTEGER DEFAULT 2000,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Processing options
    include_transcript BOOLEAN DEFAULT false,
    force_refresh BOOLEAN DEFAULT false
);

-- Create indexes for performance
CREATE INDEX idx_processing_jobs_user_id ON processing_jobs(user_id);
CREATE UNIQUE INDEX idx_processing_jobs_user_url ON processing_jobs(user_id, normalized_url);
CREATE INDEX idx_processing_jobs_status_created ON processing_jobs(status, created_at);
CREATE INDEX idx_processing_jobs_platform ON processing_jobs(platform);
CREATE INDEX idx_processing_jobs_updated_at ON processing_jobs(updated_at);

-- Create trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_processing_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();

    -- Set completed_at when status changes to completed or failed
    IF NEW.status IN ('completed', 'failed', 'unsupported') AND OLD.status NOT IN ('completed', 'failed', 'unsupported') THEN
        NEW.completed_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_processing_jobs_updated_at
    BEFORE UPDATE ON processing_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_processing_jobs_updated_at();

-- Enable Row Level Security
ALTER TABLE processing_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only access their own processing jobs
CREATE POLICY "Users can view their own processing jobs"
    ON processing_jobs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can create processing jobs for themselves
CREATE POLICY "Users can create processing jobs"
    ON processing_jobs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own processing jobs (used by Edge Functions)
CREATE POLICY "Users can update their own processing jobs"
    ON processing_jobs
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own processing jobs (for cleanup)
CREATE POLICY "Users can delete their own processing jobs"
    ON processing_jobs
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create function to cleanup old completed jobs (for scheduled tasks)
CREATE OR REPLACE FUNCTION cleanup_old_processing_jobs(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM processing_jobs
    WHERE completed_at < NOW() - INTERVAL '1 day' * retention_days
    AND status IN ('completed', 'failed', 'unsupported');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Log cleanup operation
    INSERT INTO processing_jobs_cleanup_log (deleted_count, retention_days, cleaned_at)
    VALUES (deleted_count, retention_days, NOW())
    ON CONFLICT DO NOTHING; -- Ignore if cleanup log table doesn't exist

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create optional cleanup log table for monitoring
CREATE TABLE IF NOT EXISTS processing_jobs_cleanup_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deleted_count INTEGER NOT NULL,
    retention_days INTEGER NOT NULL,
    cleaned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on cleanup log
CREATE INDEX IF NOT EXISTS idx_processing_jobs_cleanup_log_cleaned_at
    ON processing_jobs_cleanup_log(cleaned_at);

-- Add comment for documentation
COMMENT ON TABLE processing_jobs IS 'Tracks async processing jobs for short-form video metadata extraction';
COMMENT ON COLUMN processing_jobs.normalized_url IS 'Canonical URL used for deduplication and idempotency';
COMMENT ON COLUMN processing_jobs.metadata_json IS 'Extracted metadata in ShortFormMetadata format';
COMMENT ON COLUMN processing_jobs.warnings IS 'Non-fatal issues encountered during processing';
COMMENT ON COLUMN processing_jobs.poll_count IS 'Number of times this job has been polled by clients';
COMMENT ON COLUMN processing_jobs.retry_after_ms IS 'Milliseconds to wait before retrying (for rate limits)';

-- Grant necessary permissions for Edge Functions
-- Note: Edge Functions run with service role permissions, so explicit grants may not be needed
-- But we include them for clarity and potential future permission changes

GRANT SELECT, INSERT, UPDATE ON processing_jobs TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;