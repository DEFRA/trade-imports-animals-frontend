import nunjucks from 'nunjucks'

/**
 * Converts newline characters to HTML <br> tags.
 * Escapes HTML entities in the input first to prevent XSS.
 */
export function nl2br(value) {
  if (!value) return ''
  const escaped = nunjucks.runtime.SafeString
    ? String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    : String(value)
  return new nunjucks.runtime.SafeString(escaped.replace(/\n/g, '<br>'))
}
