-- Create enum for resource types (can be extended later)
CREATE TYPE resource_type AS ENUM ('book', 'video', 'podcast', 'article');

-- Resources table - stores user's knowledge items
CREATE TABLE public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Core resource fields
    type resource_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    transcript TEXT,
    tags TEXT[] DEFAULT '{}',

    -- Flexible metadata storage for type-specific fields
    -- This allows each resource type to have custom fields without schema changes
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT description_length CHECK (LENGTH(description) <= 5000),
    CONSTRAINT notes_length CHECK (LENGTH(notes) <= 50000),
    CONSTRAINT transcript_length CHECK (transcript IS NULL OR LENGTH(transcript) <= 100000)
);

-- Resource type configurations table - stores user's custom field configurations
CREATE TABLE public.resource_type_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Resource type this configuration applies to
    resource_type resource_type NOT NULL,

    -- Configuration data (label, icon, color, fields array, etc.)
    config JSONB NOT NULL DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure one config per user per resource type
    UNIQUE(user_id, resource_type)
);

-- Create indexes for performance
CREATE INDEX idx_resources_user_id ON public.resources(user_id);
CREATE INDEX idx_resources_type ON public.resources(type);
CREATE INDEX idx_resources_created_at ON public.resources(created_at DESC);
CREATE INDEX idx_resources_updated_at ON public.resources(updated_at DESC);
CREATE INDEX idx_resources_title_search ON public.resources USING gin(to_tsvector('english', title));
CREATE INDEX idx_resources_tags ON public.resources USING gin(tags);
CREATE INDEX idx_resources_metadata ON public.resources USING gin(metadata);

CREATE INDEX idx_resource_type_configs_user_id ON public.resource_type_configs(user_id);
CREATE INDEX idx_resource_type_configs_type ON public.resource_type_configs(resource_type);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_resources_updated_at
    BEFORE UPDATE ON public.resources
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_resource_type_configs_updated_at
    BEFORE UPDATE ON public.resource_type_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to initialize default resource type configurations for new users
CREATE OR REPLACE FUNCTION initialize_default_resource_type_configs(user_uuid UUID)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically initialize default configurations when a user is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM initialize_default_resource_type_configs(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table (if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Enable Row Level Security
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_type_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resources table
CREATE POLICY "Users can view their own resources"
    ON public.resources FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resources"
    ON public.resources FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resources"
    ON public.resources FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resources"
    ON public.resources FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for resource_type_configs table
CREATE POLICY "Users can view their own resource type configs"
    ON public.resource_type_configs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resource type configs"
    ON public.resource_type_configs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resource type configs"
    ON public.resource_type_configs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resource type configs"
    ON public.resource_type_configs FOR DELETE
    USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.resources TO authenticated;
GRANT ALL ON public.resource_type_configs TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
