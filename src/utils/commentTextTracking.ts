/**
 * Comment Text Tracking Utilities
 *
 * Handles character offset calculations, text similarity detection,
 * and stale comment identification when underlying text changes.
 *
 * NOTE: All text comparisons use PLAIN TEXT (markdown stripped) to avoid
 * issues with markdown formatting changes affecting staleness detection.
 */

import type { Comment } from '@/types/comments';
import { stripMarkdown } from './stripMarkdown';

let hasWarnedLegacyFallback = false;

/**
 * Calculate simple character-based similarity between two strings
 * Returns value between 0 (completely different) and 1 (identical)
 *
 * Algorithm: Count matching characters in order, divide by longer string length
 * Fast and "good enough" for comment staleness detection.
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;

  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1;

  // Count matching characters in sequence
  let matches = 0;
  let shorterIndex = 0;

  for (let i = 0; i < longer.length && shorterIndex < shorter.length; i++) {
    if (longer[i] === shorter[shorterIndex]) {
      matches++;
      shorterIndex++;
    }
  }

  return matches / longer.length;
}

/**
 * Check if comment text has changed enough to mark as stale
 *
 * @param text - Current full text content (markdown)
 * @param comment - Comment to check
 * @returns Object with isStale flag and current text at offset range
 *
 * NOTE: Uses PLAIN TEXT comparison (markdown stripped) to avoid false positives
 * from formatting changes like **bold** to *italic*
 */
export function checkCommentStale(
  text: string,
  comment: Comment
): { isStale: boolean; currentText: string } {
  // General comments can't be stale (no text anchor)
  if (comment.commentType !== 'selected-text') {
    return { isStale: false, currentText: '' };
  }

  const { startOffset, endOffset, quotedText, originalQuotedText } = comment;

  if (
    import.meta.env.DEV &&
    !originalQuotedText &&
    quotedText &&
    !hasWarnedLegacyFallback
  ) {
    console.warn(
      '[CommentTextTracking] Falling back to quotedText for staleness detection. Consider backfilling originalQuotedText for legacy comments.'
    );
    hasWarnedLegacyFallback = true;
  }

  // Safety checks
  if (startOffset === undefined || endOffset === undefined) {
    return { isStale: false, currentText: '' };
  }

  if (!quotedText && !originalQuotedText) {
    // No baseline text available; cannot evaluate staleness
    return { isStale: false, currentText: '' };
  }

  // Strip markdown from full text to work with plain text
  const plainText = stripMarkdown(text);

  const referenceText = stripMarkdown(originalQuotedText || quotedText || '');
  const desiredEnd = Math.max(endOffset, startOffset + referenceText.length);
  const safeEnd = Math.min(plainText.length, desiredEnd);
  const currentText = plainText.slice(startOffset, safeEnd);

  // If identical to reference, definitely not stale
  if (currentText === referenceText) {
    return { isStale: false, currentText };
  }

  // Calculate similarity against original text (plain text comparison)
  const similarity = calculateSimilarity(currentText, referenceText);

  // Threshold: 50% similarity
  // If less than 50% of characters match, consider stale
  const STALE_THRESHOLD = 0.5;
  const isStale = similarity < STALE_THRESHOLD;

  return { isStale, currentText };
}

/**
 * Recalculate comment offsets after text insertion or deletion
 *
 * @param comments - Array of comments to update
 * @param changeStart - Character offset where change occurred
 * @param changeLength - Length of change (positive for insertion, negative for deletion)
 * @returns Updated comments array with new offsets
 */
export function updateCommentOffsets(
  comments: Comment[],
  changeStart: number,
  changeLength: number
): Comment[] {
  // Guard against invalid inputs
  if (!Array.isArray(comments) || comments.length === 0) {
    return comments;
  }

  if (changeStart < 0) {
    console.warn('[commentTextTracking] Invalid changeStart:', changeStart);
    return comments;
  }

  return comments.map((comment) => {
    // General comments don't have offsets
    if (comment.commentType !== 'selected-text') {
      return comment;
    }

    const { startOffset, endOffset } = comment;

    if (startOffset === undefined || endOffset === undefined) {
      return comment;
    }

    // Guard against invalid offsets
    if (startOffset < 0 || endOffset < 0) {
      console.warn('[commentTextTracking] Invalid comment offsets:', { startOffset, endOffset });
      return comment;
    }

    if (startOffset > endOffset) {
      console.warn('[commentTextTracking] Invalid comment offsets:', { startOffset, endOffset });
      return comment;
    }

    // Case 1: Change is completely after this comment
    // Example: Comment at [10-20], change at position 50
    // Result: No change needed
    if (changeStart >= endOffset) {
      return comment;
    }

    // Case 2: Change is completely before this comment
    // Example: Comment at [50-60], change at position 10, length +5
    // Result: Shift both offsets right by 5 -> [55-65]
    if (changeStart < startOffset) {
      return {
        ...comment,
        startOffset: Math.max(0, startOffset + changeLength),
        endOffset: Math.max(0, endOffset + changeLength),
      };
    }

    // Case 3: Change is inside this comment OR at start boundary
    // Example: Comment at [10-30], user types at position 15, length +3
    // Result: Extend end offset by 3 -> [10-33]
    // Boundary case: User types at position 10 -> comment expands to include new text
    if (changeStart >= startOffset && changeStart <= endOffset) {
      if (comment.isStale) {
        return {
          ...comment,
          endOffset: Math.max(startOffset, Math.min(endOffset, startOffset)),
        };
      }

      const nextEnd = endOffset + changeLength;
      return {
        ...comment,
        endOffset: Math.max(startOffset, nextEnd),
      };
    }

    // Default: No change (shouldn't reach here, but safety fallback)
    return comment;
  });
}

/**
 * Find where text starts to differ between two strings
 * Used to determine where a text change occurred
 *
 * @param oldText - Previous text
 * @param newText - Current text
 * @returns Character offset where texts first differ
 */
export function findChangeStart(oldText: string, newText: string): number {
  const minLength = Math.min(oldText.length, newText.length);

  for (let i = 0; i < minLength; i++) {
    if (oldText[i] !== newText[i]) {
      return i;
    }
  }

  // If one string is prefix of other, change starts at end of shorter string
  return minLength;
}

/**
 * Calculate the length of a text change
 *
 * @param oldText - Previous text
 * @param newText - Current text
 * @returns Signed integer (positive for insertion, negative for deletion)
 */
export function calculateChangeLength(oldText: string, newText: string): number {
  return newText.length - oldText.length;
}

/**
 * Batch update multiple comments for text changes
 * Combines offset update and stale detection in one pass
 *
 * @param comments - Comments to update
 * @param oldText - Previous full text (markdown)
 * @param newText - Current full text (markdown)
 * @returns Updated comments with new offsets and stale flags
 *
 * NOTE: Works with PLAIN TEXT (markdown stripped) for accurate offset tracking
 */
export function updateCommentsForTextChange(
  comments: Comment[],
  oldText: string,
  newText: string
): Comment[] {
  // Strip markdown to work with plain text for accurate offset calculation
  const oldPlainText = stripMarkdown(oldText);
  const newPlainText = stripMarkdown(newText);

  // Find where change occurred in plain text
  const changeStart = findChangeStart(oldPlainText, newPlainText);
  const changeLength = calculateChangeLength(oldPlainText, newPlainText);

  // Update offsets (these are plain text offsets)
  let updatedComments = updateCommentOffsets(comments, changeStart, changeLength);

  // Check for stale comments using plain text comparison
  updatedComments = updatedComments.map((comment) => {
    // Pass the original markdown text, checkCommentStale will strip it internally
    const { isStale, currentText } = checkCommentStale(newText, comment);

    // Only update if stale status changed
    if (isStale && !comment.isStale) {
      return {
        ...comment,
        isStale: true,
        originalQuotedText: comment.originalQuotedText || comment.quotedText,
        quotedText: currentText, // Plain text from checkCommentStale
      };
    }

    // If recovered from stale (user undid changes)
    if (!isStale && comment.isStale) {
      return {
        ...comment,
        isStale: false,
        quotedText: currentText,
        endOffset: comment.startOffset !== undefined ? comment.startOffset + currentText.length : comment.endOffset,
      };
    }

    // Update quoted text even if not stale (keeps in sync)
    if (
      comment.commentType === 'selected-text' &&
      !comment.isStale &&
      currentText !== comment.quotedText
    ) {
      return {
        ...comment,
        quotedText: currentText, // Plain text
      };
    }

    return comment;
  });

  return updatedComments;
}
