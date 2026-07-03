import { resolveMessage } from '../i18n/index.js'

/**
 * Findings -> the two GDS error structures the GOV.UK macros consume:
 *   errors        { target: 'First message' } — drives per-field errorMessage
 *                 (lib/fields/errors.js keys date parts as `name-day`)
 *   errorSummary  [{ text, href }]            — drives govukErrorSummary,
 *                 each href `#target` so the summary link focuses the input
 * The target is `inputName` plus the finding's focusSuffix (date findings
 * carry '-day', matching the govukDateInput part id convention).
 *
 * Copy comes through the throwing resolver — an uncatalogued code THROWS
 * here (propagated deliberately, graft 7) rather than reaching the DOM.
 * First message wins per target, spike-a parity.
 */
export const toFieldErrors = (findings, resolve = resolveMessage) =>
  findings.reduce(
    (acc, finding) => {
      const target = `${finding.inputName}${finding.focusSuffix ?? ''}`
      if (acc.errors[target] !== undefined) {
        return acc
      }
      const message = resolve(finding.code, finding.values)
      return {
        errors: { ...acc.errors, [target]: message },
        errorSummary: [
          ...acc.errorSummary,
          { text: message, href: `#${target}` }
        ]
      }
    },
    { errors: {}, errorSummary: [] }
  )
