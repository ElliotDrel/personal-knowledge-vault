-- Fix emoji icons in existing resource type configurations
UPDATE public.resource_type_configs
SET config = jsonb_set(config, '{icon}', '"📚"')
WHERE resource_type = 'book';

UPDATE public.resource_type_configs
SET config = jsonb_set(config, '{icon}', '"🎬"')
WHERE resource_type = 'video';

UPDATE public.resource_type_configs
SET config = jsonb_set(config, '{icon}', '"🎧"')
WHERE resource_type = 'podcast';

UPDATE public.resource_type_configs
SET config = jsonb_set(config, '{icon}', '"📄"')
WHERE resource_type = 'article';