/**
 * AINotesCheckTool Component
 *
 * Provides UI for triggering AI-powered notes analysis with multi-stage progress display.
 * Uses React Query for API call management and provides user feedback throughout the process.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useStorageAdapter } from '@/data/storageAdapter';

// ============================================================================
// Types
// ============================================================================

type ProcessingStage = 'idle' | 'analyzing' | 'generating' | 'creating' | 'complete' | 'error';

const STAGE_MESSAGES: Record<Exclude<ProcessingStage, 'idle'>, string> = {
  analyzing: 'Analyzing your notes and metadata...',
  generating: 'Generating improvement suggestions...',
  creating: 'Creating comments in your sidebar...',
  complete: 'AI review complete!',
  error: 'Something went wrong. Please try again.',
};

interface AINotesCheckToolProps {
  resourceId: string;
  onComplete?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function AINotesCheckTool({ resourceId, onComplete }: AINotesCheckToolProps) {
  const [stage, setStage] = useState<ProcessingStage>('idle');
  const [commentsCreated, setCommentsCreated] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const storage = useStorageAdapter();
  const queryClient = useQueryClient();

  const runAICheck = useMutation({
    mutationFn: async () => {
      // Stage 1: Analyzing (simulated delay for UX)
      setStage('analyzing');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Stage 2: Generating (actual API call)
      setStage('generating');
      const result = await storage.runAINotesCheck(resourceId);

      if (!result.success) {
        throw new Error(result.error?.message || 'AI processing failed');
      }

      // Stage 3: Creating (brief delay for UX)
      setStage('creating');
      await new Promise((resolve) => setTimeout(resolve, 800));

      return result;
    },
    onSuccess: (result) => {
      setStage('complete');
      setCommentsCreated(result.commentsCreated || 0);

      // Invalidate comments query to trigger refresh
      queryClient.invalidateQueries({ queryKey: ['comments', resourceId] });

      // Auto-reset after showing success
      setTimeout(() => {
        setStage('idle');
        onComplete?.();
      }, 2500);
    },
    onError: (error: Error) => {
      console.error('[AINotesCheckTool] Error:', error);
      setStage('error');
      setErrorMessage(error.message || 'An unexpected error occurred');

      // Auto-reset after showing error
      setTimeout(() => {
        setStage('idle');
        setErrorMessage('');
      }, 4000);
    },
  });

  const handleRunCheck = () => {
    if (stage !== 'idle') return;
    runAICheck.mutate();
  };

  const isProcessing = stage !== 'idle' && stage !== 'complete' && stage !== 'error';
  const canTrigger = stage === 'idle';

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h4 className="font-medium">AI Notes Check</h4>
        </div>
      </div>

      {/* Description */}
      {stage === 'idle' && (
        <p className="text-sm text-muted-foreground">
          Let AI analyze your notes and suggest improvements for clarity, completeness, and structure.
        </p>
      )}

      {/* Progress Stage */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{STAGE_MESSAGES[stage]}</span>
          </div>
          <Progress value={undefined} className="h-2" />
        </div>
      )}

      {/* Success State */}
      {stage === 'complete' && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            {STAGE_MESSAGES.complete} Created {commentsCreated} comment{commentsCreated !== 1 ? 's' : ''}.
          </span>
        </div>
      )}

      {/* Error State */}
      {stage === 'error' && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMessage || STAGE_MESSAGES.error}</span>
        </div>
      )}

      {/* Action Button */}
      <Button
        onClick={handleRunCheck}
        disabled={!canTrigger}
        className="w-full"
        variant={stage === 'complete' ? 'outline' : 'default'}
      >
        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {stage === 'complete' && <CheckCircle className="mr-2 h-4 w-4" />}
        {stage === 'error' && <AlertCircle className="mr-2 h-4 w-4" />}
        {stage === 'idle' && 'Check my notes with AI'}
        {isProcessing && 'Processing...'}
        {stage === 'complete' && 'Done!'}
        {stage === 'error' && 'Try Again'}
      </Button>

      {/* Additional Info */}
      {stage === 'idle' && (
        <p className="text-xs text-muted-foreground">
          This usually takes 5-10 seconds. AI comments will appear in the sidebar with a rainbow border.
        </p>
      )}
    </div>
  );
}
