/**
 * Timestamp utilities for comparing ISO date strings safely.
 *
 * Provides a resilient parser that returns `null` when the input cannot
 * be parsed, allowing call sites to decide on appropriate fallbacks.
 */
export const parseTimestamp = (value?: string | null): number | null => {
  if (!value) {
    return null;
  }

  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
};
