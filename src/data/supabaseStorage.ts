import { supabase } from '@/lib/supabaseClient';
import { isResourceTypeColor, type ResourceTypeColor, type ResourceTypeId } from '@/types/resource';
import { Resource } from './mockData';
import type {
  Comment,
  CommentWithReplies,
  CreateCommentInput,
  UpdateCommentInput,
  CommentStatus,
  AIProcessingLog,
  AINotesCheckResponse,
} from '@/types/comments';
import type { Tables } from '@/types/supabase-generated';
import { stripMarkdown } from '@/utils/stripMarkdown';

type CommentRow = Tables<'comments'>;

// Database types that align with our schema
export interface DatabaseResource {
  id: string;
  user_id: string;
  type: ResourceTypeId;
  title: string;
  description: string;
  notes: string;
  transcript: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DatabaseResourceTypeConfig {
  id: string;
  user_id: string;
  resource_type: ResourceTypeId;
  config: {
    label: string;
    icon: string;
    color: string;
    fields: string[];
  };
  created_at: string;
  updated_at: string;
}

// Transform database resource to frontend Resource interface
const transformDatabaseResource = (dbResource: DatabaseResource): Resource => {
  const { metadata, created_at, updated_at, ...baseResource } = dbResource;

  return {
    ...baseResource,
    // Merge metadata fields into the main resource object
    ...metadata,
    transcript: dbResource.transcript || undefined,
    createdAt: created_at,
    updatedAt: updated_at,
  };
};

// Transform frontend Resource to database format
const transformToDatabase = (resource: Resource): Partial<DatabaseResource> => {
  const {
    id,
    type,
    title,
    description,
    notes,
    transcript,
    tags,
    createdAt,
    updatedAt,
    ...metadata
  } = resource;

  return {
    id,
    type,
    title,
    description,
    notes,
    transcript: transcript || null,
    tags,
    metadata,
    // Don't include timestamps for updates - they're handled by triggers
  };
};

// Get the current authenticated user
const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('User not authenticated');
  }
  return user;
};

// Resource CRUD Operations

export const getResources = async (): Promise<Resource[]> => {
  try {
    const user = await getCurrentUser();

    const query = supabase
      .from('resources')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('[supabaseStorage] getResources: Error fetching resources:', error);
      throw new Error(`Failed to fetch resources: ${error.message}`);
    }

    const transformed = (data || []).map(transformDatabaseResource);

    return transformed;
  } catch (error) {
    console.error('[supabaseStorage] getResources: Error in getResources:', error);
    throw error;
  }
};

export const getResourceById = async (id: string): Promise<Resource | null> => {
  try {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching resource:', error);
      throw new Error(`Failed to fetch resource: ${error.message}`);
    }

    return data ? transformDatabaseResource(data) : null;
  } catch (error) {
    console.error('Error in getResourceById:', error);
    throw error;
  }
};

export const addResource = async (resource: Resource): Promise<Resource> => {
  try {
    const user = await getCurrentUser();
    const dbResource = transformToDatabase(resource);

    const { data, error } = await supabase
      .from('resources')
      .insert({
        ...dbResource,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding resource:', error);
      throw new Error(`Failed to add resource: ${error.message}`);
    }

    return transformDatabaseResource(data);
  } catch (error) {
    console.error('Error in addResource:', error);
    throw error;
  }
};

export const updateResource = async (resourceId: string, updates: Partial<Resource>): Promise<Resource> => {
  try {

    const user = await getCurrentUser();

    // Get current resource first to merge updates
    const currentResource = await getResourceById(resourceId);
    if (!currentResource) {
      console.error('[supabaseStorage] updateResource: Resource not found', { resourceId });
      throw new Error('Resource not found');
    }

    // Merge updates with current resource
    const mergedResource = { ...currentResource, ...updates };

    const dbUpdates = transformToDatabase(mergedResource);

    const { data, error } = await supabase
      .from('resources')
      .update(dbUpdates)
      .eq('id', resourceId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[supabaseStorage] updateResource: Supabase error', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw new Error(`Failed to update resource: ${error.message}`);
    }


    const transformedResult = transformDatabaseResource(data);

    if (import.meta.env.DEV) {
      // In development, verify the persisted record to catch replication delays early.
      try {
        const { data: verification, error: verificationError } = await supabase
          .from('resources')
          .select('id, transcript, updated_at')
          .eq('id', resourceId)
          .eq('user_id', user.id)
          .single();

        if (verificationError) {
          console.warn('[supabaseStorage] updateResource: Verification query failed', verificationError);
        } else if (verification) {
          const expectedTranscript = mergedResource.transcript ?? '';
          const verificationTranscript = verification.transcript ?? '';

          if (verificationTranscript !== expectedTranscript) {
            console.warn('[supabaseStorage] updateResource: Transcript verification mismatch', {
              resourceId,
              expectedLength: expectedTranscript.length,
              verifiedLength: verificationTranscript.length,
            });
          }

          if (verification.updated_at !== data.updated_at) {
            console.warn('[supabaseStorage] updateResource: updated_at mismatch after verification', {
              resourceId,
              expectedUpdatedAt: data.updated_at,
              verifiedUpdatedAt: verification.updated_at,
            });
          }
        }
      } catch (verificationException) {
        console.warn('[supabaseStorage] updateResource: Verification query threw exception', verificationException);
      }
    }

    return transformedResult;
  } catch (error) {
    console.error('[supabaseStorage] updateResource: Error caught in outer try/catch:', error);
    console.error('[supabaseStorage] updateResource: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
};

export const deleteResource = async (resourceId: string): Promise<void> => {
  try {
    const user = await getCurrentUser();

    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', resourceId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting resource:', error);
      throw new Error(`Failed to delete resource: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteResource:', error);
    throw error;
  }
};

// Helper functions for filtering and searching
export const getResourcesByType = async (type: string): Promise<Resource[]> => {
  try {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', type)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching resources by type:', error);
      throw new Error(`Failed to fetch resources by type: ${error.message}`);
    }

    return (data || []).map(transformDatabaseResource);
  } catch (error) {
    console.error('Error in getResourcesByType:', error);
    throw error;
  }
};

export const getRecentResources = async (limit = 5): Promise<Resource[]> => {
  try {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent resources:', error);
      throw new Error(`Failed to fetch recent resources: ${error.message}`);
    }

    return (data || []).map(transformDatabaseResource);
  } catch (error) {
    console.error('Error in getRecentResources:', error);
    throw error;
  }
};

// Resource Type Configuration Operations

export type ResourceTypeConfig = {
  [key in ResourceTypeId]: {
    label: string;
    icon: string;
    color: ResourceTypeColor;
    fields: string[];
  };
};

export const getResourceTypeConfig = async (): Promise<ResourceTypeConfig> => {
  try {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('resource_type_configs')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching resource type config:', error);
      throw new Error(`Failed to fetch resource type config: ${error.message}`);
    }

    // Transform array of configs into the expected object format
    const config: ResourceTypeConfig = {
      book: { label: 'Books', icon: '📚', color: 'knowledge-book', fields: ['author', 'year', 'isbn'] },
      video: { label: 'Videos', icon: '🎬', color: 'knowledge-video', fields: ['creator', 'platform', 'duration', 'url'] },
      'short-video': { label: 'Short Videos', icon: '📱', color: 'knowledge-short-video', fields: ['platform', 'channelName', 'handle', 'viewCount', 'hashtags', 'duration', 'url'] },
      podcast: { label: 'Podcasts', icon: '🎧', color: 'knowledge-podcast', fields: ['creator', 'platform', 'duration', 'episode'] },
      article: { label: 'Articles', icon: '📄', color: 'knowledge-article', fields: ['author', 'platform', 'readTime', 'url'] }
    };

    // Override with user's custom configurations
    (data || []).forEach((item: DatabaseResourceTypeConfig) => {
      const current = config[item.resource_type];
      if (!current) {
        return;
      }

      const incomingColor = item.config?.color;
      let resolvedColor: ResourceTypeColor = current.color;

      if (typeof incomingColor === 'string' && isResourceTypeColor(incomingColor)) {
        resolvedColor = incomingColor;
      }

      config[item.resource_type] = {
        ...current,
        ...item.config,
        color: resolvedColor,
      };
    });

    return config;
  } catch (error) {
    console.error('Error in getResourceTypeConfig:', error);
    throw error;
  }
};

export const updateResourceTypeFields = async (
  resourceType: ResourceTypeId,
  fields: string[]
): Promise<ResourceTypeConfig> => {
  try {
    const user = await getCurrentUser();
    const currentConfig = await getResourceTypeConfig();

    const updatedConfig = {
      ...currentConfig[resourceType],
      fields,
    };

    const { error } = await supabase
      .from('resource_type_configs')
      .upsert({
        user_id: user.id,
        resource_type: resourceType,
        config: updatedConfig,
      });

    if (error) {
      console.error('Error updating resource type fields:', error);
      throw new Error(`Failed to update resource type fields: ${error.message}`);
    }

    return await getResourceTypeConfig();
  } catch (error) {
    console.error('Error in updateResourceTypeFields:', error);
    throw error;
  }
};

export const addFieldToResourceType = async (
  resourceType: ResourceTypeId,
  fieldName: string
): Promise<ResourceTypeConfig> => {
  try {
    const config = await getResourceTypeConfig();
    const currentFields = config[resourceType].fields;

    if (currentFields.includes(fieldName)) {
      return config;
    }

    const updatedFields = [...currentFields, fieldName];
    return await updateResourceTypeFields(resourceType, updatedFields);
  } catch (error) {
    console.error('Error in addFieldToResourceType:', error);
    throw error;
  }
};

export const removeFieldFromResourceType = async (
  resourceType: ResourceTypeId,
  fieldName: string
): Promise<ResourceTypeConfig> => {
  try {
    const config = await getResourceTypeConfig();
    const currentFields = config[resourceType].fields;
    const updatedFields = currentFields.filter((field) => field !== fieldName);
    return await updateResourceTypeFields(resourceType, updatedFields);
  } catch (error) {
    console.error('Error in removeFieldFromResourceType:', error);
    throw error;
  }
};

// Real-time subscriptions for live updates
export const subscribeToResourceChanges = (callback: () => void) => {
  const channel = supabase
    .channel('resources_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'resources',
      },
      () => {
        callback();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export const subscribeToResourceTypeConfigChanges = (callback: () => void) => {
  const channel = supabase
    .channel('resource_type_configs_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'resource_type_configs',
      },
      () => {
        callback();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

// ============================================
// COMMENT OPERATIONS
// ============================================

const mapToComment = (row: CommentRow): Comment => {
  return {
    id: row.id,
    resourceId: row.resource_id,
    userId: row.user_id,
    commentType: row.comment_type,
    status: row.status,
    body: row.body,
    startOffset: row.start_offset ?? undefined,
    endOffset: row.end_offset ?? undefined,
    quotedText: row.quoted_text ?? undefined,
    isStale: row.is_stale ?? undefined,
    originalQuotedText: row.original_quoted_text ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at ?? undefined,
    threadRootId: row.thread_root_id ?? null,
    threadPrevCommentId: row.thread_prev_comment_id ?? null,
    // AI fields
    createdByAi: row.created_by_ai ?? false,
    aiCommentCategory: row.ai_comment_category ?? undefined,
    aiSuggestionType: row.ai_suggestion_type ?? undefined,
    aiProcessingLogId: row.ai_processing_log_id ?? undefined,
    retryCount: row.retry_count ?? undefined,
  };
};

const sortByChronology = (a: Comment, b: Comment) => {
  const delta = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  if (delta !== 0) return delta;
  return a.id.localeCompare(b.id);
};

const buildCommentWithReplies = (rootRow: CommentRow, replyRows: CommentRow[]): CommentWithReplies => {
  const root = mapToComment(rootRow);
  const replies = replyRows.map(mapToComment).sort(sortByChronology);
  return {
    ...root,
    replies,
  };
};

export const getComments = async (
  resourceId: string,
  status?: CommentStatus
): Promise<CommentWithReplies[]> => {
  try {
    const user = await getCurrentUser();

    let rootQuery = supabase
      .from('comments')
      .select('*')
      .eq('resource_id', resourceId)
      .eq('user_id', user.id)
      .is('thread_root_id', null)
      .order('created_at', { ascending: true });

    if (status) {
      rootQuery = rootQuery.eq('status', status);
    }

    const { data: rootRowsData, error: rootError } = await rootQuery;

    if (rootError) {
      console.error('[supabaseStorage] Error fetching root comments:', rootError);
      throw new Error(`Failed to fetch comments: ${rootError.message}`);
    }

    const rootRows = (rootRowsData ?? []) as CommentRow[];
    const rootIds = rootRows.map((row) => row.id);

    let replyRows: CommentRow[] = [];

    if (rootIds.length > 0) {
      const { data: repliesData, error: replyError } = await supabase
        .from('comments')
        .select('*')
        .eq('user_id', user.id)
        .in('thread_root_id', rootIds)
        .order('created_at', { ascending: true });

      if (replyError) {
        console.error('[supabaseStorage] Error fetching threaded replies:', replyError);
        throw new Error(`Failed to fetch threaded replies: ${replyError.message}`);
      }

      replyRows = (repliesData ?? []) as CommentRow[];
    }

    const repliesByRoot = new Map<string, CommentRow[]>();
    replyRows.forEach((row) => {
      const key = row.thread_root_id;
      if (!key) return;
      if (!repliesByRoot.has(key)) {
        repliesByRoot.set(key, []);
      }
      repliesByRoot.get(key)!.push(row);
    });

    return rootRows.map((rootRow) =>
      buildCommentWithReplies(rootRow, repliesByRoot.get(rootRow.id) ?? [])
    );
  } catch (error) {
    console.error('[supabaseStorage] Error in getComments:', error);
    throw error;
  }
};

export const getComment = async (commentId: string): Promise<CommentWithReplies> => {
  try {
    const user = await getCurrentUser();

    const { data: commentRowData, error: commentError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .eq('user_id', user.id)
      .single();

    if (commentError) {
      console.error('[supabaseStorage] Error fetching comment:', commentError);
      throw new Error(`Failed to fetch comment: ${commentError.message}`);
    }

    const commentRow = commentRowData as CommentRow;
    const rootId = commentRow.thread_root_id ?? commentRow.id;

    const rootRow: CommentRow =
      commentRow.thread_root_id === null
        ? commentRow
        : await (async () => {
            const { data, error } = await supabase
              .from('comments')
              .select('*')
              .eq('id', rootId)
              .eq('user_id', user.id)
              .single();

            if (error) {
              console.error('[supabaseStorage] Error fetching root comment:', error);
              throw new Error(`Failed to fetch root comment: ${error.message}`);
            }

            return data as CommentRow;
          })();

    const { data: replyRowsData, error: replyError } = await supabase
      .from('comments')
      .select('*')
      .eq('user_id', user.id)
      .eq('thread_root_id', rootId)
      .order('created_at', { ascending: true });

    if (replyError) {
      console.error('[supabaseStorage] Error fetching replies:', replyError);
      throw new Error(`Failed to fetch replies: ${replyError.message}`);
    }

    const replyRows = (replyRowsData ?? []) as CommentRow[];

    return buildCommentWithReplies(rootRow, replyRows);
  } catch (error) {
    console.error('[supabaseStorage] Error in getComment:', error);
    throw error;
  }
};

export const getUnresolvedCount = async (resourceId: string): Promise<number> => {
  try {
    const user = await getCurrentUser();

    const { count, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('resource_id', resourceId)
      .eq('user_id', user.id)
      .is('thread_root_id', null)
      .eq('status', 'active');

    if (error) {
      console.error('[supabaseStorage] Error counting comments:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('[supabaseStorage] Error in getUnresolvedCount:', error);
    return 0;
  }
};

export const createComment = async (
  input: CreateCommentInput
): Promise<CommentWithReplies> => {
  try {
    const user = await getCurrentUser();

    const normalizedQuotedText =
      typeof input.quotedText === 'string' ? stripMarkdown(input.quotedText) : null;

    const payload: Record<string, unknown> = {
      resource_id: input.resourceId,
      user_id: user.id,
      comment_type: input.commentType,
      status: 'active',
      start_offset: input.startOffset ?? null,
      end_offset: input.endOffset ?? null,
      quoted_text: normalizedQuotedText,
      body: input.body.trim(),
      thread_root_id: input.threadRootId ?? null,
      thread_prev_comment_id: input.threadPrevCommentId ?? null,
      // Save full original text for staleness detection
      original_quoted_text: normalizedQuotedText,
    };

    const { data: commentRowData, error } = await supabase
      .from('comments')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[supabaseStorage] Error creating comment:', error);
      throw new Error(`Failed to create comment: ${error.message}`);
    }

    const commentRow = commentRowData as CommentRow;

    if (commentRow.thread_root_id) {
      // Created a reply; return the refreshed thread
      return getComment(commentRow.thread_root_id);
    }

    return {
      ...mapToComment(commentRow),
      replies: [],
    };
  } catch (error) {
    console.error('[supabaseStorage] Error in createComment:', error);
    throw error;
  }
};

export const addReply = async (commentId: string, body: string): Promise<Comment> => {
  try {
    const user = await getCurrentUser();

    const { data: targetRowData, error: targetError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .eq('user_id', user.id)
      .single();

    if (targetError) {
      console.error('[supabaseStorage] Error loading target comment:', targetError);
      throw new Error(`Failed to load target comment: ${targetError.message}`);
    }

    const targetRow = targetRowData as CommentRow;

    const rootId = targetRow.thread_root_id ?? targetRow.id;

    const { data: lastRepliesData, error: lastError } = await supabase
      .from('comments')
      .select('id')
      .eq('user_id', user.id)
      .eq('thread_root_id', rootId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (lastError) {
      console.error('[supabaseStorage] Error finding last reply:', lastError);
      throw new Error(`Failed to determine reply position: ${lastError.message}`);
    }

    const lastReplies = (lastRepliesData ?? []) as Array<Pick<CommentRow, 'id'>>;
    const previousCommentId = lastReplies.length > 0 ? lastReplies[0].id : rootId;

    const { data: insertedRow, error: insertError } = await supabase
      .from('comments')
      .insert({
        resource_id: targetRow.resource_id,
        user_id: user.id,
        comment_type: 'general',
        status: 'active',
        body: body.trim(),
        start_offset: null,
        end_offset: null,
        quoted_text: null,
        is_stale: null,
        original_quoted_text: null,
        thread_root_id: rootId,
        thread_prev_comment_id: previousCommentId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[supabaseStorage] Error adding threaded comment:', insertError);
      throw new Error(`Failed to add reply: ${insertError.message}`);
    }

    return mapToComment(insertedRow as CommentRow);
  } catch (error) {
    console.error('[supabaseStorage] Error in addReply:', error);
    throw error;
  }
};

export const updateComment = async (
  commentId: string,
  updates: UpdateCommentInput
): Promise<Comment> => {
  try {
    const user = await getCurrentUser();

    const payload: Record<string, unknown> = {};

    if (updates.body !== undefined) payload.body = updates.body;
    if (updates.quotedText !== undefined) payload.quoted_text = updates.quotedText;
    if (updates.isStale !== undefined) payload.is_stale = updates.isStale;
    if (updates.originalQuotedText !== undefined) {
      payload.original_quoted_text = updates.originalQuotedText;
    }
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.resolvedAt !== undefined) payload.resolved_at = updates.resolvedAt;

    if (Object.keys(payload).length === 0) {
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('id', commentId)
        .eq('user_id', user.id)
        .single();
      return mapToComment(data as CommentRow);
    }

    const { data, error } = await supabase
      .from('comments')
      .update(payload)
      .eq('id', commentId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[supabaseStorage] Error updating comment:', error);
      throw new Error(`Failed to update comment: ${error.message}`);
    }

    return mapToComment(data as CommentRow);
  } catch (error) {
    console.error('[supabaseStorage] Error in updateComment:', error);
    throw error;
  }
};

export const resolveComment = async (commentId: string): Promise<Comment> => {
  return updateComment(commentId, {
    status: 'resolved',
    resolvedAt: new Date().toISOString(),
  });
};

export const markAsStale = async (
  commentId: string,
  newQuotedText: string
): Promise<Comment> => {
  try {
    const thread = await getComment(commentId);
    const target =
      thread.id === commentId
        ? thread
        : thread.replies.find((reply) => reply.id === commentId) || thread;

    return updateComment(commentId, {
      isStale: true,
      originalQuotedText: target.originalQuotedText || target.quotedText,
      quotedText: newQuotedText,
    });
  } catch (error) {
    console.error('[supabaseStorage] Error in markAsStale:', error);
    throw error;
  }
};

export const deleteComment = async (commentId: string): Promise<void> => {
  try {
    const user = await getCurrentUser();

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[supabaseStorage] Error deleting comment:', error);
      throw new Error(`Failed to delete comment: ${error.message}`);
    }
  } catch (error) {
    console.error('[supabaseStorage] Error in deleteComment:', error);
    throw error;
  }
};

export const deleteReply = async (replyId: string): Promise<void> => {
  try {
    const user = await getCurrentUser();

    const { data: replyRowData, error: fetchError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', replyId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('[supabaseStorage] Error locating reply:', fetchError);
      throw new Error(`Failed to locate reply: ${fetchError.message}`);
    }

    const replyRow = replyRowData as CommentRow;

    if (!replyRow.thread_root_id) {
      throw new Error('Cannot delete a root comment through deleteReply');
    }

    if (replyRow.status !== 'resolved') {
      throw new Error('Replies must be resolved before deletion');
    }

    const replacementPrev = replyRow.thread_prev_comment_id;

    const { error: updateChainError } = await supabase
      .from('comments')
      .update({ thread_prev_comment_id: replacementPrev })
      .eq('thread_prev_comment_id', replyId)
      .eq('user_id', user.id);

    if (updateChainError) {
      console.error('[supabaseStorage] Error updating thread chain:', updateChainError);
      throw new Error(`Failed to update thread chain: ${updateChainError.message}`);
    }

    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', replyId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[supabaseStorage] Error deleting reply:', deleteError);
      throw new Error(`Failed to delete reply: ${deleteError.message}`);
    }
  } catch (error) {
    console.error('[supabaseStorage] Error in deleteReply:', error);
    throw error;
  }
};

// ============================================================================
// AI Operations
// ============================================================================

/**
 * Run AI Notes Check on a resource
 * Calls the Edge Function to analyze notes and create AI comments
 */
export const runAINotesCheck = async (resourceId: string): Promise<AINotesCheckResponse> => {
  try {
    const { data, error } = await supabase.functions.invoke('ai-notes-check', {
      body: { resourceId },
    });

    if (error) {
      console.error('[supabaseStorage] Edge Function error:', error);
      throw new Error(`AI Notes Check failed: ${error.message}`);
    }

    if (!data || !data.success) {
      console.error('[supabaseStorage] Edge Function returned error:', data?.error);
      throw new Error(data?.error?.message || 'AI Notes Check failed');
    }

    return data as AINotesCheckResponse;
  } catch (error) {
    console.error('[supabaseStorage] Error in runAINotesCheck:', error);
    throw error;
  }
};

/**
 * Get AI processing logs for a resource
 */
export const getAIProcessingLogs = async (resourceId: string): Promise<AIProcessingLog[]> => {
  try {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('ai_processing_logs')
      .select('*')
      .eq('resource_id', resourceId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[supabaseStorage] Error fetching AI processing logs:', error);
      throw new Error(`Failed to fetch processing logs: ${error.message}`);
    }

    // Transform snake_case to camelCase
    return (data || []).map((log) => ({
      id: log.id,
      parentLogId: log.parent_log_id,
      userId: log.user_id,
      resourceId: log.resource_id,
      actionType: log.action_type,
      attemptNumber: log.attempt_number,
      status: log.status as AIProcessingLog['status'],
      modelUsed: log.model_used,
      inputData: log.input_data as Record<string, unknown> | null | undefined,
      outputData: log.output_data as Record<string, unknown> | null | undefined,
      errorDetails: log.error_details as Record<string, unknown> | null | undefined,
      processingTimeMs: log.processing_time_ms,
      createdAt: log.created_at,
      updatedAt: log.updated_at,
    }));
  } catch (error) {
    console.error('[supabaseStorage] Error in getAIProcessingLogs:', error);
    throw error;
  }
};

/**
 * Get active AI-generated comments for a resource
 */
export const getActiveAIComments = async (resourceId: string): Promise<Comment[]> => {
  try {
    const user = await getCurrentUser();

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('resource_id', resourceId)
      .eq('user_id', user.id)
      .eq('created_by_ai', true)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[supabaseStorage] Error fetching active AI comments:', error);
      throw new Error(`Failed to fetch AI comments: ${error.message}`);
    }

    return (data || []).map(mapToComment);
  } catch (error) {
    console.error('[supabaseStorage] Error in getActiveAIComments:', error);
    throw error;
  }
};
