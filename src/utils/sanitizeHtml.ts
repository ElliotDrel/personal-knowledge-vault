/**
 * Minimal HTML sanitization utility.
 *
 * Removes dangerous tags (script, style, iframe, etc.) and strips attributes
 * that can execute code (event handlers, javascript: URLs, srcdoc).
 *
 * Designed for client-side use where DOMParser is available. On the server,
 * returns the input unchanged so hydration can sanitize once mounted.
 */
const BLOCKED_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'noscript',
  'template',
]);

const BLOCKED_ATTRS = new Set(['srcdoc', 'formaction']);
const DANGEROUS_PROTOCOLS = ['javascript:', 'vbscript:', 'data:text/html'];

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return html;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  // Remove disallowed elements entirely
  body.querySelectorAll(Array.from(BLOCKED_TAGS).join(',')).forEach((node) => {
    node.remove();
  });

  // Scrub dangerous attributes
  body.querySelectorAll('*').forEach((element) => {
    for (const attr of Array.from(element.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value?.trim()?.toLowerCase();

      if (name.startsWith('on') || BLOCKED_ATTRS.has(name)) {
        element.removeAttribute(attr.name);
        continue;
      }

      if (value) {
        if (DANGEROUS_PROTOCOLS.some((protocol) => value.startsWith(protocol))) {
          element.removeAttribute(attr.name);
        }
      }
    }
  });

  return body.innerHTML;
}
