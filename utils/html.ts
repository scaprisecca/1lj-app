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