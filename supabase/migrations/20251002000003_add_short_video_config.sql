-- Migration: Add 'short-video' resource type configuration
-- Date: 2025-10-02
-- Description: Seeds short-video configuration for all existing users and updates
--              the default initialization function for new users.

BEGIN;

-- Step 1: Backfill short-video config for all existing users
-- Inserts short-video configuration for every user who has at least one config
INSERT INTO public.resource_type_configs (user_id, resource_type, config)
SELECT DISTINCT
  user_id,
  'short-video'::resource_type,
  jsonb_build_object(
    'label', 'Short Videos',
    'icon', '📱',
    'color', 'knowledge-short-video',
    'fields', jsonb_build_array(
      'platform',
      'channelName',
      'handle',
      'viewCount',
      'hashtags',
      'creator',
      'duration',
      'url'
    )
  )
FROM public.resource_type_configs
WHERE user_id NOT IN (
  -- Exclude users who already have short-video config
  SELECT user_id
  FROM public.resource_type_configs
  WHERE resource_type = 'short-video'
)
ON CONFLICT (user_id, resource_type) DO NOTHING;

-- Step 2: Update default initialization function for new users
-- Replaces existing function to include short-video in default configs
CREATE OR REPLACE FUNCTION initialize_default_resource_type_configs(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert default configurations for each resource type
  INSERT INTO public.resource_type_configs (user_id, resource_type, config) VALUES
    (user_uuid, 'book', '{
      "label": "Books",
      "icon": "📚",
      "color": "knowledge-book",
      "fields": ["author", "year", "isbn"]
    }'),
    (user_uuid, 'video', '{
      "label": "Videos",
      "icon": "🎬",
      "color": "knowledge-video",
      "fields": ["creator", "platform", "duration", "url"]
    }'),
    (user_uuid, 'short-video', '{
      "label": "Short Videos",
      "icon": "📱",
      "color": "knowledge-short-video",
      "fields": ["platform", "channelName", "handle", "viewCount", "hashtags", "creator", "duration", "url"]
    }'),
    (user_uuid, 'podcast', '{
      "label": "Podcasts",
      "icon": "🎧",
      "color": "knowledge-podcast",
      "fields": ["creator", "platform", "duration", "episode"]
    }'),
    (user_uuid, 'article', '{
      "label": "Articles",
      "icon": "📄",
      "color": "knowledge-article",
      "fields": ["author", "platform", "readTime", "url"]
    }')
  ON CONFLICT (user_id, resource_type) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION initialize_default_resource_type_configs IS 'Initializes default resource type configurations for new users, including short-video';

-- Step 3: Validation and logging
DO $$
DECLARE
  total_users integer;
  users_with_short_video_config integer;
  coverage_percentage numeric;
BEGIN
  -- Count total distinct users
  SELECT COUNT(DISTINCT user_id) INTO total_users
  FROM public.resource_type_configs;

  -- Count users with short-video config
  SELECT COUNT(DISTINCT user_id) INTO users_with_short_video_config
  FROM public.resource_type_configs
  WHERE resource_type = 'short-video';

  -- Calculate coverage percentage
  IF total_users > 0 THEN
    coverage_percentage := ROUND((users_with_short_video_config::numeric / total_users::numeric) * 100, 2);
  ELSE
    coverage_percentage := 0;
  END IF;

  -- Log seeding results
  RAISE NOTICE 'Config seeding complete: % out of % users have short-video config (% coverage)',
    users_with_short_video_config, total_users, coverage_percentage || '%';

  -- Safety check: ensure all users have short-video config
  IF users_with_short_video_config < total_users THEN
    RAISE WARNING 'Not all users have short-video config. Expected: %, Actual: %',
      total_users, users_with_short_video_config;
  END IF;
END;
$$;

COMMIT;

-- Validation Queries (run manually after migration):
--
-- 1. Verify all users have short-video config:
-- SELECT user_id FROM resource_type_configs
-- GROUP BY user_id
-- HAVING NOT bool_or(resource_type = 'short-video');
-- Expected: 0 rows
--
-- 2. Check short-video config structure:
-- SELECT user_id, config FROM resource_type_configs WHERE resource_type = 'short-video' LIMIT 3;
--
-- 3. Test new user initialization:
-- SELECT initialize_default_resource_type_configs('00000000-0000-0000-0000-000000000000');
-- SELECT resource_type FROM resource_type_configs WHERE user_id = '00000000-0000-0000-0000-000000000000';
-- Expected: book, video, short-video, podcast, article
