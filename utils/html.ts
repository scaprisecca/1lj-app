/**
 * HTML utility functions for the journal app
 * Handles conversion between HTML and plain text for display and character counting
 */

/**
 * Converts HTML content to plain text by removing all HTML tags
 * @param html - HTML string to convert
 * @returns Plain text string with HTML tags removed
 */
export function htmlToPlainText(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return html
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Remove extra whitespace and normalize line breaks
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Counts the number of characters in HTML content (excluding HTML tags)
 * @param html - HTML string to count characters in
 * @returns Number of text characters (excluding HTML markup)
 */
export function countHtmlCharacters(html: string): number {
  const plainText = htmlToPlainText(html);
  return plainText.length;
}

/**
 * Truncates HTML content to a specified character limit while preserving HTML structure
 * @param html - HTML string to truncate
 * @param limit - Maximum number of text characters (excluding HTML tags)
 * @param suffix - Text to append when truncated (default: '...')
 * @returns Truncated HTML string
 */
export function truncateHtml(html: string, limit: number, suffix: string = '...'): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const plainText = htmlToPlainText(html);
  
  if (plainText.length <= limit) {
    return html;
  }

  // For simple truncation, we'll convert to plain text and truncate
  // A more sophisticated version would preserve HTML structure
  const truncatedText = plainText.substring(0, limit);
  return truncatedText + suffix;
}

/**
 * Creates a plain text preview from HTML content
 * @param html - HTML string to create preview from
 * @param maxLength - Maximum length of preview (default: 150)
 * @returns Plain text preview
 */
export function createTextPreview(html: string, maxLength: number = 150): string {
  const plainText = htmlToPlainText(html);
  
  if (plainText.length <= maxLength) {
    return plainText;
  }

  return plainText.substring(0, maxLength).trim() + '...';
}

/**
 * Checks if HTML content is empty (contains only whitespace and/or empty tags)
 * @param html - HTML string to check
 * @returns True if content is empty, false otherwise
 */
export function isHtmlEmpty(html: string): boolean {
  const plainText = htmlToPlainText(html);
  return plainText.trim().length === 0;
}

// Tags the rich text editor can actually produce. Everything else (script,
// iframe, img, style, event-handler-bearing attributes, ...) is stripped.
const SANITIZE_ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 'h1', 'h2', 'ul', 'ol', 'li', 'div', 'span',
]);

/**
 * Sanitizes untrusted HTML (e.g. from a restored backup file) down to a small
 * allowlist of tags, stripping all attributes and any disallowed tag.
 *
 * This is a real single-pass tokenizer, not a regex replace: it walks the
 * string tracking tag boundaries (respecting quoted attribute values) so
 * malformed/nested markup like `<<script>script>` can't reconstruct a live
 * tag the way a naive regex strip can.
 *
 * @param html - Untrusted HTML string
 * @returns HTML string containing only allowlisted, attribute-free tags
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let result = '';
  const len = html.length;
  let i = 0;

  while (i < len) {
    const ch = html[i];

    if (ch !== '<') {
      result += ch;
      i++;
      continue;
    }

    // Comments can contain arbitrary characters, including '>' and entire
    // fake tags. Consume through the closing '-->' before any generic tag
    // scanning gets a chance to treat the embedded markup as real.
    if (html.startsWith('<!--', i)) {
      const commentEnd = html.indexOf('-->', i + 4);
      i = commentEnd === -1 ? len : commentEnd + 3;
      continue;
    }

    // Find the end of this tag, respecting quoted attribute values so a
    // '>' inside e.g. title="a>b" doesn't terminate the tag early.
    let j = i + 1;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    while (j < len) {
      const c = html[j];
      if (c === '"' && !inSingleQuote) inDoubleQuote = !inDoubleQuote;
      else if (c === "'" && !inDoubleQuote) inSingleQuote = !inSingleQuote;
      else if (c === '>' && !inSingleQuote && !inDoubleQuote) break;
      j++;
    }

    if (j >= len) {
      // Unterminated tag - drop the rest of the string rather than
      // emitting a dangling '<'.
      break;
    }

    const tagContent = html.slice(i + 1, j);
    i = j + 1;

    // Drop comments, doctypes, and processing instructions entirely.
    if (tagContent.startsWith('!') || tagContent.startsWith('?')) {
      continue;
    }

    const isClosing = tagContent.startsWith('/');
    const nameSource = isClosing ? tagContent.slice(1) : tagContent;
    const nameMatch = nameSource.match(/^([a-zA-Z][a-zA-Z0-9]*)/);

    if (!nameMatch) {
      // Not a recognizable tag (e.g. stray '<' followed by another '<') -
      // drop it silently.
      continue;
    }

    const tagName = nameMatch[1].toLowerCase();
    if (!SANITIZE_ALLOWED_TAGS.has(tagName)) {
      continue;
    }

    if (tagName === 'br') {
      result += '<br>';
    } else {
      result += isClosing ? `</${tagName}>` : `<${tagName}>`;
    }
  }

  return result;
}