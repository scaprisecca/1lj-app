import {
  htmlToPlainText,
  countHtmlCharacters,
  truncateHtml,
  createTextPreview,
  isHtmlEmpty,
} from '@/utils/html';

describe('htmlToPlainText', () => {
  it('should convert simple HTML to plain text', () => {
    expect(htmlToPlainText('<p>Hello World</p>')).toBe('Hello World');
  });

  it('should remove all HTML tags', () => {
    expect(htmlToPlainText('<div><strong>Bold</strong> and <em>italic</em></div>'))
      .toBe('Bold and italic');
  });

  it('should decode HTML entities', () => {
    expect(htmlToPlainText('&lt;tag&gt;&nbsp;&amp;&nbsp;&quot;quote&quot;'))
      .toBe('<tag> & "quote"');
  });

  it('should handle empty string', () => {
    expect(htmlToPlainText('')).toBe('');
  });

  it('should handle null/undefined inputs', () => {
    expect(htmlToPlainText(null as any)).toBe('');
    expect(htmlToPlainText(undefined as any)).toBe('');
  });

  it('should handle non-string inputs', () => {
    expect(htmlToPlainText(123 as any)).toBe('');
  });

  it('should normalize whitespace', () => {
    expect(htmlToPlainText('<p>Multiple   spaces</p>\n<p>New line</p>'))
      .toBe('Multiple spaces New line');
  });

  it('should trim leading/trailing whitespace', () => {
    expect(htmlToPlainText('  <p>Text</p>  ')).toBe('Text');
  });
});

describe('countHtmlCharacters', () => {
  it('should count characters excluding HTML tags', () => {
    expect(countHtmlCharacters('<p>Hello</p>')).toBe(5);
  });

  it('should count zero for empty HTML', () => {
    expect(countHtmlCharacters('<p></p>')).toBe(0);
  });

  it('should count correctly with entities', () => {
    expect(countHtmlCharacters('&lt;test&gt;')).toBe(6); // <test>
  });

  it('should handle complex nested HTML', () => {
    const html = '<div><p>First</p><ul><li>Item 1</li><li>Item 2</li></ul></div>';
    expect(countHtmlCharacters(html)).toBe(17); // "First Item 1 Item 2"
  });
});

describe('truncateHtml', () => {
  it('should not truncate if under limit', () => {
    const html = '<p>Short text</p>';
    expect(truncateHtml(html, 100)).toBe(html);
  });

  it('should truncate text exceeding limit', () => {
    const html = '<p>This is a very long text that needs truncation</p>';
    const result = truncateHtml(html, 20);
    expect(result).toBe('This is a very long ...');
  });

  it('should use custom suffix', () => {
    const html = '<p>Long text here</p>';
    const result = truncateHtml(html, 5, '…');
    expect(result).toBe('Long …');
  });

  it('should handle empty input', () => {
    expect(truncateHtml('', 10)).toBe('');
  });

  it('should handle null/undefined', () => {
    expect(truncateHtml(null as any, 10)).toBe('');
  });
});

describe('createTextPreview', () => {
  it('should create preview within default length', () => {
    const html = '<p>Sample journal entry text</p>';
    const preview = createTextPreview(html);
    expect(preview).toBe('Sample journal entry text');
  });

  it('should truncate long content', () => {
    const html = '<p>' + 'a'.repeat(200) + '</p>';
    const preview = createTextPreview(html, 150);
    expect(preview.length).toBeLessThanOrEqual(154); // 150 + '...'
    expect(preview).toContain('...');
  });

  it('should respect custom maxLength', () => {
    const html = '<p>This is a test</p>';
    const preview = createTextPreview(html, 10);
    expect(preview).toBe('This is a...');
  });
});

describe('isHtmlEmpty', () => {
  it('should return true for empty tags', () => {
    expect(isHtmlEmpty('<p></p>')).toBe(true);
  });

  it('should return true for whitespace only', () => {
    expect(isHtmlEmpty('<p>   </p>')).toBe(true);
  });

  it('should return true for nested empty tags', () => {
    expect(isHtmlEmpty('<div><p></p><span></span></div>')).toBe(true);
  });

  it('should return false for actual content', () => {
    expect(isHtmlEmpty('<p>Text</p>')).toBe(false);
  });

  it('should return true for non-breaking spaces', () => {
    // After conversion, &nbsp; becomes a space, which is then trimmed
    expect(isHtmlEmpty('&nbsp;')).toBe(true);
  });

  it('should handle empty string', () => {
    expect(isHtmlEmpty('')).toBe(true);
  });
});
