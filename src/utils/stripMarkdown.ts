/**
 * Strip Markdown Formatting Utility
 *
 * Removes markdown syntax while preserving plain text content.
 * Used for comment positioning and staleness detection to avoid
 * issues with markdown syntax characters affecting text offsets.
 *
 * Example:
 *   Input:  "**bold** and *italic*"
 *   Output: "bold and italic"
 */

/**
 * Strips markdown formatting from text, leaving only plain text content.
 *
 * Handles:
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Code: `code` or ```code```
 * - Links: [text](url)
 * - Headings: # Heading
 * - Lists: - item or * item or 1. item
 * - Blockquotes: > quote
 * - Horizontal rules: --- or ***
 * - Strikethrough: ~~text~~
 *
 * @param markdown - Markdown text to strip
 * @returns Plain text without markdown syntax
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return '';

  let text = markdown;

  // Remove code blocks (triple backticks) first
  // Match ```language\ncode``` or ```code```
  text = text.replace(/```[\s\S]*?```/g, '');

  // Remove inline code (single backticks)
  text = text.replace(/`([^`]+)`/g, '$1');

  // Remove bold (** or __)
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/__([^_]+)__/g, '$1');

  // Remove italic (* or _)
  // Must come after bold to avoid breaking **bold**
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/_([^_]+)_/g, '$1');

  // Remove strikethrough (~~)
  text = text.replace(/~~([^~]+)~~/g, '$1');

  // Remove links [text](url) - keep the text part
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove images ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');

  // Remove headings (# ## ### etc)
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Remove blockquote markers (>)
  text = text.replace(/^>\s+/gm, '');

  // Remove list markers (-, *, +, 1.)
  text = text.replace(/^[\s]*[-*+]\s+/gm, '');
  text = text.replace(/^[\s]*\d+\.\s+/gm, '');

  // Remove horizontal rules (---, ***, ___)
  text = text.replace(/^[-*_]{3,}$/gm, '');

  // Clean up extra whitespace (but preserve single spaces and newlines)
  // Remove multiple consecutive spaces
  text = text.replace(/ {2,}/g, ' ');

  // Remove leading/trailing whitespace from each line
  text = text
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

  // Remove multiple consecutive newlines (keep max 2)
  text = text.replace(/\n{3,}/g, '\n\n');

  // Trim final result
  text = text.trim();

  return text;
}

/**
 * Get the plain text length of markdown (after stripping formatting)
 * Useful for calculating actual content length vs formatted length
 */
export function getPlainTextLength(markdown: string): number {
  return stripMarkdown(markdown).length;
}

/**
 * Check if two markdown strings have the same plain text content
 * (ignoring formatting differences)
 */
export function isSamePlainText(markdown1: string, markdown2: string): boolean {
  return stripMarkdown(markdown1) === stripMarkdown(markdown2);
}
