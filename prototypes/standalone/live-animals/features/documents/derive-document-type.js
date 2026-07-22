import * as documentTypes from '../../services/document-types/index.js'

/**
 * Derive the accompanying-document type enum code from an uploaded
 * filename.
 *
 * The trader does not pick a type; the filename carries it (e.g.
 * `itahc-scan.pdf`, `veterinary_health_certificate.docx`). Matching is
 * token-based against the document-types service enum: the filename
 * (extension stripped, separators normalised to spaces) must contain a
 * code's words in order. Longest candidate wins so
 * `veterinary-health-certificate.pdf` derives
 * 'VETERINARY_HEALTH_CERTIFICATE', not 'HEALTH_CERTIFICATE'. No match
 * derives 'OTHER'.
 *
 * @param {string} [filename] - the uploaded file's name.
 * @returns {string} a member of `documentTypes()`.
 */
export const deriveDocumentTypeFromFilename = (filename = '') => {
  const haystack = ` ${normalise(stripExtension(filename))} `
  const hit = candidates().find(({ key }) => haystack.includes(` ${key} `))
  return hit?.code ?? FALLBACK
}

const FALLBACK = 'OTHER'

const normalise = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const stripExtension = (filename) => filename.replace(/\.[^.]+$/, '')

const candidates = () =>
  documentTypes
    .documentTypes()
    .map((code) => ({ code, key: normalise(code) }))
    .filter(({ code, key }) => key.length > 0 && code !== FALLBACK)
    .sort((first, second) => second.key.length - first.key.length)
