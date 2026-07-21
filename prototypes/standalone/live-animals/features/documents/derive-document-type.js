import * as documentTypes from '../../services/document-types/index.js'

/**
 * Derive the accompanying-document type from an uploaded filename.
 *
 * The trader does not pick a type; the filename carries it (e.g.
 * `itahc-scan.pdf`, `veterinary_health_certificate.docx`). Matching is
 * token-based against the document-types service list: the filename
 * (extension stripped, separators normalised to spaces) must contain a
 * type's words in order. Longest candidate wins so
 * `veterinary-health-certificate.pdf` derives 'Veterinary health
 * certificate', not 'Health certificate'. Parenthetical qualifiers on
 * the service labels (e.g. '(Directive 2008/61/EC)') are not required
 * in the filename. No match derives 'Other'.
 *
 * @param {string} [filename] - the uploaded file's name.
 * @returns {string} a member of `documentTypes()`.
 */
export const deriveDocumentTypeFromFilename = (filename = '') => {
  const haystack = ` ${normalise(stripExtension(filename))} `
  const hit = candidates().find(({ key }) => haystack.includes(` ${key} `))
  return hit?.label ?? FALLBACK
}

const FALLBACK = 'Other'

const normalise = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const stripExtension = (filename) => filename.replace(/\.[^.]+$/, '')

const candidates = () =>
  documentTypes
    .documentTypes()
    .map((label) => ({ label, key: normalise(label.split('(')[0]) }))
    .filter(({ label, key }) => key.length > 0 && label !== FALLBACK)
    .sort((a, b) => b.key.length - a.key.length)
