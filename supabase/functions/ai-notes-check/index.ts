/**
 * Supabase Edge Function: AI Notes Check
 *
 * Analyzes user notes and creates AI-generated comment suggestions for improvements.
 *
 * Endpoint: POST /ai-notes-check
 * Body: { resourceId: string }
 * Response: { success: boolean, commentsCreated?: number, processingLogId?: string, error?: {...} }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import type {
  AINotesCheckRequest,
  AINotesCheckResponse,
  User,
  Resource,
  Comment,
  AIProcessingLog,
  AICommentSuggestion,
  AICommentsResponse,
  AnthropicRequest,
  AnthropicResponse,
} from './types.ts';
import { AI_CONFIG, getAIMetadataForResource } from './config.ts';

// ============================================================================
// Environment & Initialization
// ============================================================================

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

if (!anthropicApiKey) {
  throw new Error('Missing ANTHROPIC_API_KEY environment variable');
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================================
// Helper Functions (to be implemented in Step 2.3)
// ============================================================================

/**
 * Validate JWT token and extract user information
 */
async function getUserFromJWT(authHeader: string): Promise<User | null> {
  try {
    const token = authHeader.replace('Bearer ', '');
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.error('[ai-notes-check] JWT validation error:', error?.message);
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email,
      aud: data.user.aud,
      role: data.user.role,
    };
  } catch (error) {
    console.error('[ai-notes-check] Exception during JWT validation:', error);
    return null;
  }
}

/**
 * Fetch resource data with security check
 */
async function fetchResourceData(resourceId: string, userId: string): Promise<Resource | null> {
  try {
    console.log('[ai-notes-check] Fetching resource:', resourceId, 'for user:', userId);

    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('id', resourceId)
      .eq('user_id', userId) // Security: Only fetch user's own resources
      .single();

    if (error) {
      console.error('[ai-notes-check] Error fetching resource:', error.message);
      return null;
    }

    if (!data) {
      console.error('[ai-notes-check] Resource not found or access denied');
      return null;
    }

    console.log('[ai-notes-check] Resource fetched successfully:', {
      type: data.type,
      notesLength: data.notes?.length || 0,
      transcriptLength: data.transcript?.length || 0,
    });

    return data as Resource;
  } catch (error) {
    console.error('[ai-notes-check] Exception fetching resource:', error);
    return null;
  }
}

/**
 * Fetch existing AI comments for context
 */
async function fetchExistingAIComments(resourceId: string, userId: string): Promise<Comment[]> {
  try {
    console.log('[ai-notes-check] Fetching existing AI comments for resource:', resourceId);

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('resource_id', resourceId)
      .eq('user_id', userId) // Security: Only fetch user's own comments
      .eq('created_by_ai', true)
      .eq('status', 'active') // Only active comments (not resolved)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ai-notes-check] Error fetching AI comments:', error.message);
      return [];
    }

    console.log('[ai-notes-check] Found', data?.length || 0, 'existing AI comments');

    return (data as Comment[]) || [];
  } catch (error) {
    console.error('[ai-notes-check] Exception fetching AI comments:', error);
    return [];
  }
}

/**
 * Build prompt for Anthropic API
 */
function buildPrompt(
  notes: string,
  metadata: Record<string, unknown>,
  existingComments: Comment[]
): string {
  // Build sections of the prompt
  const sections: string[] = [];

  // Section 1: User Notes
  sections.push('# User Notes\n');
  if (notes && notes.trim().length > 0) {
    sections.push(notes);
  } else {
    sections.push('(No notes provided yet)');
  }
  sections.push('\n');

  // Section 2: Resource Metadata
  if (Object.keys(metadata).length > 0) {
    sections.push('# Resource Metadata\n');
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== null && value !== undefined && value !== '') {
        // Format the value appropriately
        const formattedValue = typeof value === 'string' && value.length > 500
          ? value.substring(0, 500) + '...'
          : String(value);
        sections.push(`**${key}**: ${formattedValue}\n`);
      }
    }
    sections.push('\n');
  }

  // Section 3: Existing AI Comments (to prevent duplicates)
  if (existingComments.length > 0) {
    sections.push('# Existing AI Suggestions (Do NOT Duplicate)\n');
    existingComments.forEach((comment, index) => {
      sections.push(`${index + 1}. ${comment.body}\n`);
    });
    sections.push('\n');
  }

  // Section 4: Instructions
  sections.push('# Task\n');
  sections.push('Analyze the user notes and provide improvement suggestions as JSON comments.\n');
  sections.push(`${AI_CONFIG.JSON_SCHEMA_INSTRUCTIONS}\n`);

  const prompt = sections.join('');

  console.log('[ai-notes-check] Built prompt:', {
    totalLength: prompt.length,
    notesLength: notes.length,
    metadataFields: Object.keys(metadata).length,
    existingCommentsCount: existingComments.length,
  });

  return prompt;
}

/**
 * Call Anthropic API
 */
async function callAnthropicAPI(prompt: string): Promise<AICommentsResponse> {
  try {
    console.log('[ai-notes-check] Calling Anthropic API...');

    const requestBody: AnthropicRequest = {
      model: AI_CONFIG.MODEL,
      max_tokens: 4096,
      system: AI_CONFIG.SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey!,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ai-notes-check] Anthropic API error:', response.status, errorText);
      throw new Error(`Anthropic API returned ${response.status}: ${errorText}`);
    }

    const data: AnthropicResponse = await response.json();

    console.log('[ai-notes-check] Anthropic API response received:', {
      model: data.model,
      stopReason: data.stop_reason,
      inputTokens: data.usage.input_tokens,
      outputTokens: data.usage.output_tokens,
    });

    // Extract text from response
    if (!data.content || data.content.length === 0) {
      console.error('[ai-notes-check] No content in Anthropic response');
      throw new Error('No content in Anthropic response');
    }

    const responseText = data.content[0].text;
    console.log('[ai-notes-check] Response text length:', responseText.length);

    // Parse JSON response
    let parsedResponse: AICommentsResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[ai-notes-check] Failed to parse AI response as JSON:', parseError);
      console.error('[ai-notes-check] Response text:', responseText.substring(0, 200));
      throw new Error('AI returned invalid JSON');
    }

    // Validate response structure
    if (!parsedResponse.comments || !Array.isArray(parsedResponse.comments)) {
      console.error('[ai-notes-check] Invalid response structure - missing comments array');
      throw new Error('Invalid AI response structure');
    }

    // Validate and filter comments
    const validComments = parsedResponse.comments.filter((comment) => {
      // Check required fields
      if (!comment.category || !comment.suggestionType || !comment.body) {
        console.warn('[ai-notes-check] Skipping comment with missing fields:', comment);
        return false;
      }

      // Check category values
      if (!['general', 'selected_text'].includes(comment.category)) {
        console.warn('[ai-notes-check] Skipping comment with invalid category:', comment.category);
        return false;
      }

      // Check suggestion type values
      const validTypes = ['missing_concept', 'rewording', 'factual_correction', 'structural_suggestion'];
      if (!validTypes.includes(comment.suggestionType)) {
        console.warn('[ai-notes-check] Skipping comment with invalid suggestion type:', comment.suggestionType);
        return false;
      }

      // Check body length
      if (comment.body.length > AI_CONFIG.MAX_COMMENT_LENGTH) {
        console.warn('[ai-notes-check] Comment body too long, truncating:', comment.body.length);
        comment.body = comment.body.substring(0, AI_CONFIG.MAX_COMMENT_LENGTH - 3) + '...';
      }

      // Validate selected text requirements
      if (comment.category === 'selected_text') {
        if (!comment.selectedText || comment.selectedText.length < AI_CONFIG.MIN_SELECTED_TEXT_LENGTH) {
          console.warn('[ai-notes-check] Skipping selected_text comment with invalid selectedText');
          return false;
        }
      } else {
        // General comments should have null selectedText
        comment.selectedText = null;
      }

      return true;
    });

    console.log('[ai-notes-check] Validated', validComments.length, 'of', parsedResponse.comments.length, 'comments');

    // Limit to MAX_COMMENTS_PER_RUN
    const limitedComments = validComments.slice(0, AI_CONFIG.MAX_COMMENTS_PER_RUN);

    if (limitedComments.length < validComments.length) {
      console.log('[ai-notes-check] Limited comments from', validComments.length, 'to', AI_CONFIG.MAX_COMMENTS_PER_RUN);
    }

    return { comments: limitedComments };
  } catch (error) {
    console.error('[ai-notes-check] Exception calling Anthropic API:', error);
    throw error;
  }
}

/**
 * Find exact text match in notes
 */
function findExactTextMatch(notes: string, selectedText: string): { start: number; end: number } | null {
  // Find first occurrence
  const index = notes.indexOf(selectedText);

  if (index === -1) {
    // Text not found
    console.log('[ai-notes-check] Text not found in notes');
    return null;
  }

  // Check for multiple occurrences (ambiguous)
  const secondOccurrence = notes.indexOf(selectedText, index + 1);

  if (secondOccurrence !== -1) {
    // Text appears multiple times - ambiguous
    console.log('[ai-notes-check] Text appears multiple times in notes (ambiguous)');
    return null;
  }

  // Unique match found
  return {
    start: index,
    end: index + selectedText.length,
  };
}

/**
 * Process a single comment suggestion with retry logic
 */
async function processCommentWithRetry(
  suggestion: AICommentSuggestion,
  context: { notes: string; resourceId: string; userId: string; processingLogId: string },
  attemptNumber: number
): Promise<{ success: boolean; commentId?: string; error?: string }> {
  try {
    console.log('[ai-notes-check] Processing comment:', {
      category: suggestion.category,
      suggestionType: suggestion.suggestionType,
      attemptNumber,
    });

    let startOffset: number | null = null;
    let endOffset: number | null = null;
    let quotedText: string | null = null;

    // Handle selected-text comments
    if (suggestion.category === 'selected_text' && suggestion.selectedText) {
      const match = findExactTextMatch(context.notes, suggestion.selectedText);

      if (!match) {
        // Text matching failed
        if (attemptNumber < AI_CONFIG.MAX_RETRY_ATTEMPTS) {
          console.log('[ai-notes-check] Text match failed, would retry, but retry with AI feedback not yet implemented');
          // TODO: In a future enhancement, we could call the AI again with feedback
          // For now, we'll just fail this comment
        }

        return {
          success: false,
          error: 'text_match_failed',
        };
      }

      startOffset = match.start;
      endOffset = match.end;
      quotedText = suggestion.selectedText;
    }

    // Create the comment in the database
    const { data, error } = await supabase
      .from('comments')
      .insert({
        resource_id: context.resourceId,
        user_id: context.userId,
        comment_type: suggestion.category === 'selected_text' ? 'selected-text' : 'general',
        status: 'active',
        body: suggestion.body,
        start_offset: startOffset,
        end_offset: endOffset,
        quoted_text: quotedText,
        is_stale: false,
        created_by_ai: true,
        ai_comment_category: suggestion.category,
        ai_suggestion_type: suggestion.suggestionType,
        ai_processing_log_id: context.processingLogId,
        retry_count: attemptNumber - 1, // 0 for first attempt, 1+ for retries
      })
      .select('id')
      .single();

    if (error) {
      console.error('[ai-notes-check] Error creating comment:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('[ai-notes-check] Comment created successfully:', data.id);

    return {
      success: true,
      commentId: data.id,
    };
  } catch (error) {
    console.error('[ai-notes-check] Exception processing comment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create AI processing log entry
 */
async function createProcessingLog(log: Partial<AIProcessingLog>): Promise<string> {
  try {
    console.log('[ai-notes-check] Creating processing log');

    const { data, error } = await supabase
      .from('ai_processing_logs')
      .insert({
        user_id: log.user_id!,
        resource_id: log.resource_id || null,
        action_type: log.action_type || 'notes_check',
        attempt_number: log.attempt_number || 1,
        status: log.status || 'processing',
        model_used: log.model_used || AI_CONFIG.MODEL,
        input_data: log.input_data || null,
        output_data: log.output_data || null,
        error_details: log.error_details || null,
        processing_time_ms: log.processing_time_ms || null,
        parent_log_id: log.parent_log_id || null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[ai-notes-check] Error creating processing log:', error.message);
      // Return a placeholder ID if logging fails (don't fail the operation)
      return 'log-error-' + Date.now();
    }

    console.log('[ai-notes-check] Processing log created:', data.id);
    return data.id;
  } catch (error) {
    console.error('[ai-notes-check] Exception creating processing log:', error);
    return 'log-exception-' + Date.now();
  }
}

/**
 * Update AI processing log
 */
async function updateProcessingLog(logId: string, updates: Partial<AIProcessingLog>): Promise<void> {
  try {
    // Skip if this is a placeholder ID from a failed log creation
    if (logId.startsWith('log-error-') || logId.startsWith('log-exception-')) {
      console.log('[ai-notes-check] Skipping update for placeholder log ID');
      return;
    }

    console.log('[ai-notes-check] Updating processing log:', logId);

    const { error } = await supabase
      .from('ai_processing_logs')
      .update({
        status: updates.status,
        output_data: updates.output_data,
        error_details: updates.error_details,
        processing_time_ms: updates.processing_time_ms,
      })
      .eq('id', logId);

    if (error) {
      console.error('[ai-notes-check] Error updating processing log:', error.message);
      // Don't throw - logging failures shouldn't fail the operation
    } else {
      console.log('[ai-notes-check] Processing log updated successfully');
    }
  } catch (error) {
    console.error('[ai-notes-check] Exception updating processing log:', error);
    // Don't throw - logging failures shouldn't fail the operation
  }
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // 1. Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[ai-notes-check] Missing Authorization header');
      return Response.json(
        {
          success: false,
          error: {
            code: 'unauthorized',
            message: 'Authorization required',
          },
        } as AINotesCheckResponse,
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    const user = await getUserFromJWT(authHeader);
    if (!user) {
      console.error('[ai-notes-check] Invalid or expired token');
      return Response.json(
        {
          success: false,
          error: {
            code: 'unauthorized',
            message: 'Invalid or expired token',
          },
        } as AINotesCheckResponse,
        {
          status: 401,
          headers: corsHeaders,
        }
      );
    }

    console.log('[ai-notes-check] Authenticated user:', user.id);

    // 2. Parse request
    let body: AINotesCheckRequest;
    try {
      body = await req.json();
    } catch (error) {
      console.error('[ai-notes-check] Invalid JSON body:', error);
      return Response.json(
        {
          success: false,
          error: {
            code: 'invalid_request',
            message: 'Invalid JSON body',
          },
        } as AINotesCheckResponse,
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    if (!body.resourceId) {
      console.error('[ai-notes-check] Missing resourceId in request');
      return Response.json(
        {
          success: false,
          error: {
            code: 'invalid_request',
            message: 'Missing resourceId',
          },
        } as AINotesCheckResponse,
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    console.log('[ai-notes-check] Processing resource:', body.resourceId);

    // 3. Create processing log
    const processingLogId = await createProcessingLog({
      user_id: user.id,
      resource_id: body.resourceId,
      action_type: 'notes_check',
      attempt_number: 1,
      status: 'processing',
      model_used: AI_CONFIG.MODEL,
    });

    try {
      // 4. Fetch resource data
      const resource = await fetchResourceData(body.resourceId, user.id);

      if (!resource) {
        await updateProcessingLog(processingLogId, {
          status: 'failed',
          error_details: { message: 'Resource not found or access denied' },
          processing_time_ms: Date.now() - startTime,
        });

        return Response.json(
          {
            success: false,
            error: {
              code: 'resource_not_found',
              message: 'Resource not found or you do not have access to it',
            },
          } as AINotesCheckResponse,
          {
            status: 404,
            headers: corsHeaders,
          }
        );
      }

      // 5. Check if notes are empty
      if (!resource.notes || resource.notes.trim().length === 0) {
        await updateProcessingLog(processingLogId, {
          status: 'failed',
          error_details: { message: 'Notes are empty' },
          processing_time_ms: Date.now() - startTime,
        });

        return Response.json(
          {
            success: false,
            error: {
              code: 'empty_notes',
              message: 'Cannot analyze empty notes. Please add some notes first.',
            },
          } as AINotesCheckResponse,
          {
            status: 400,
            headers: corsHeaders,
          }
        );
      }

      // 6. Fetch existing AI comments (to prevent duplicates)
      const existingComments = await fetchExistingAIComments(body.resourceId, user.id);

      // 7. Extract relevant metadata
      const metadata = getAIMetadataForResource(resource);

      console.log('[ai-notes-check] Context gathered:', {
        notesLength: resource.notes.length,
        metadataFields: Object.keys(metadata).length,
        existingComments: existingComments.length,
      });

      // 8. Build prompt and call Anthropic API
      const prompt = buildPrompt(resource.notes, metadata, existingComments);

      let aiResponse: AICommentsResponse;
      try {
        aiResponse = await callAnthropicAPI(prompt);
      } catch (apiError) {
        console.error('[ai-notes-check] Anthropic API call failed:', apiError);

        await updateProcessingLog(processingLogId, {
          status: 'failed',
          error_details: {
            message: apiError instanceof Error ? apiError.message : String(apiError),
            stage: 'anthropic_api',
          },
          processing_time_ms: Date.now() - startTime,
        });

        return Response.json(
          {
            success: false,
            error: {
              code: 'ai_api_error',
              message: 'Failed to get suggestions from AI. Please try again later.',
            },
          } as AINotesCheckResponse,
          {
            status: 500,
            headers: corsHeaders,
          }
        );
      }

      console.log('[ai-notes-check] Received', aiResponse.comments.length, 'suggestions from AI');

      // 9. Process each suggestion and create comments
      let commentsCreated = 0;
      let commentsFailed = 0;
      const failedComments: Array<{ suggestion: AICommentSuggestion; error: string }> = [];

      for (const suggestion of aiResponse.comments) {
        const result = await processCommentWithRetry(
          suggestion,
          {
            notes: resource.notes,
            resourceId: body.resourceId,
            userId: user.id,
            processingLogId,
          },
          1 // Attempt number
        );

        if (result.success) {
          commentsCreated++;
        } else {
          commentsFailed++;
          failedComments.push({ suggestion, error: result.error || 'unknown' });
        }
      }

      console.log('[ai-notes-check] Processing complete:', {
        commentsCreated,
        commentsFailed,
      });

      // 10. Update processing log with results
      const processingTimeMs = Date.now() - startTime;
      const finalStatus: 'completed' | 'partial_success' | 'failed' =
        commentsCreated > 0 && commentsFailed === 0
          ? 'completed'
          : commentsCreated > 0 && commentsFailed > 0
          ? 'partial_success'
          : 'failed';

      await updateProcessingLog(processingLogId, {
        status: finalStatus,
        output_data: {
          commentsCreated,
          commentsFailed,
          totalSuggestions: aiResponse.comments.length,
          failedReasons: failedComments.map((fc) => fc.error),
        },
        processing_time_ms: processingTimeMs,
      });

      // 11. Return success response
      return Response.json(
        {
          success: true,
          commentsCreated,
          commentsFailed,
          processingLogId,
        } as AINotesCheckResponse,
        {
          status: 200,
          headers: corsHeaders,
        }
      );
    } catch (processingError) {
      console.error('[ai-notes-check] Processing error:', processingError);

      const processingTimeMs = Date.now() - startTime;

      await updateProcessingLog(processingLogId, {
        status: 'failed',
        error_details: {
          message: processingError instanceof Error ? processingError.message : String(processingError),
          stage: 'processing',
        },
        processing_time_ms: processingTimeMs,
      });

      return Response.json(
        {
          success: false,
          error: {
            code: 'processing_error',
            message: 'An error occurred while processing your notes. Please try again.',
          },
        } as AINotesCheckResponse,
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }
  } catch (error) {
    console.error('[ai-notes-check] Unexpected error:', error);

    const processingTimeMs = Date.now() - startTime;

    return Response.json(
      {
        success: false,
        error: {
          code: 'internal_error',
          message: 'An unexpected error occurred',
        },
      } as AINotesCheckResponse,
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});

console.log('[ai-notes-check] Edge Function initialized');
