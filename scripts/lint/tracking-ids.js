export const TRACKING_ID_PATTERNS = [
  { pattern: /\bEUDPA-\d+/i, kind: 'a ticket key' },
  { pattern: /\b(?:c|d|q|inc|req)-\d{3}\b/, kind: 'a backlog or ruling id' },
  { pattern: /\bdesign release\b/i, kind: 'a release name' },
  { pattern: /\bDR2\.1\b/i, kind: 'a release name' },
  { pattern: /\bRuled\b/, kind: 'a ruling' },
  { pattern: /\breal service\b/i, kind: 'session vocabulary' }
]

/**
 * Finds the first ticket key, backlog or ruling id, release name or session
 * word in a piece of comment or test-title text.
 *
 * @param {string} text - the comment or title text
 * @returns {{ match: string, kind: string } | null} what was found, or null
 */
export const findTrackingId = (text) => {
  for (const { pattern, kind } of TRACKING_ID_PATTERNS) {
    const found = pattern.exec(text)
    if (found) {
      return { match: found[0], kind }
    }
  }
  return null
}
