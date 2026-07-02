/**
 * Dependency-free form-control extractor over rendered HTML (TEST-8/10..12)
 * — plain regex, no cheerio/jsdom, per the no-new-dependencies rail. Folds
 * govuk-frontend markup into one logical control per input name: radio and
 * checkbox groups collapse by shared name, date triples (`X-day`/`X-month`/
 * `X-year`) collapse to one `date` control, selects carry their option
 * values. Names on the ignore allowlist (the crumb) never surface.
 */

/** Names that are plumbing, not model-backed controls. */
export const IGNORED_NAMES = Object.freeze(['crumb'])

const TAG_PATTERN = /<(input|select|textarea)\b[^>]*>/gi

const attributeOf = (tag, attribute) =>
  new RegExp(`\\b${attribute}="([^"]*)"`).exec(tag)?.[1]

const selectOptionValues = (html, name) => {
  const pattern = /<select\b([^>]*)>([\s\S]*?)<\/select>/gi
  for (const [, attributes, body] of html.matchAll(pattern)) {
    if (!attributes.includes(`name="${name}"`)) {
      continue
    }
    return [...body.matchAll(/<option\b[^>]*value="([^"]*)"/gi)].map(
      ([, value]) => value
    )
  }
  return []
}

const rawControls = (html) =>
  [...html.matchAll(TAG_PATTERN)].map(([tag, element]) => ({
    element: element.toLowerCase(),
    name: attributeOf(tag, 'name'),
    id: attributeOf(tag, 'id'),
    type: attributeOf(tag, 'type')?.toLowerCase(),
    value: attributeOf(tag, 'value'),
    describedBy: attributeOf(tag, 'aria-describedby')
  }))

const foldDateTriples = (controls) => {
  const byName = new Map(controls.map((control) => [control.name, control]))
  const folded = []
  const consumed = new Set()
  for (const control of controls) {
    if (consumed.has(control.name)) {
      continue
    }
    const prefix = control.name.replace(/-day$/, '')
    const parts = ['day', 'month', 'year'].map((part) => `${prefix}-${part}`)
    if (
      control.name.endsWith('-day') &&
      parts.every((part) => byName.has(part))
    ) {
      parts.forEach((part) => consumed.add(part))
      folded.push({ name: prefix, kind: 'date' })
      continue
    }
    folded.push(control)
  }
  return folded
}

const kindOf = (control) => {
  if (control.element === 'select') {
    return 'select'
  }
  if (control.element === 'textarea') {
    return 'textarea'
  }
  if (control.type === 'file') {
    return 'file'
  }
  return 'input'
}

/**
 * extractInputs(html, options?) -> one record per logical control:
 * `{ name, kind, inputType?, values?, options?, describedBy? }` where
 * kind is input | date | radios | checkboxes | select | textarea | file.
 */
export function extractInputs(html, { ignore = IGNORED_NAMES } = {}) {
  const controls = []
  const groups = new Map()
  for (const raw of rawControls(html)) {
    if (!raw.name || ignore.includes(raw.name)) {
      continue
    }
    if (raw.type === 'radio' || raw.type === 'checkbox') {
      const kind = raw.type === 'radio' ? 'radios' : 'checkboxes'
      const group = groups.get(raw.name) ?? { name: raw.name, kind, values: [] }
      group.values.push(raw.value)
      if (!groups.has(raw.name)) {
        groups.set(raw.name, group)
        controls.push(group)
      }
      continue
    }
    controls.push({
      name: raw.name,
      kind: kindOf(raw),
      inputType: raw.element === 'input' ? (raw.type ?? 'text') : undefined,
      options:
        raw.element === 'select'
          ? selectOptionValues(html, raw.name)
          : undefined,
      describedBy: raw.describedBy
    })
  }
  return foldDateTriples(controls)
}

/**
 * GDS error wiring for one input name: the error message paragraph
 * `#<name>-error` exists and some control points at it via
 * aria-describedby (date triples wire the fieldset, so the id check
 * alone is the paragraph half).
 */
export function errorWiring(html, inputName) {
  const errorId = `${inputName}-error`
  return {
    hasErrorMessage: html.includes(`id="${errorId}"`),
    inputDescribedBy: new RegExp(
      `aria-describedby="[^"]*\\b${errorId}\\b[^"]*"`
    ).test(html)
  }
}

/** Hrefs of every error-summary link in the rendered page. */
export function errorSummaryLinks(html) {
  const list =
    /<ul class="govuk-list govuk-error-summary__list">([\s\S]*?)<\/ul>/i.exec(
      html
    )
  if (!list) {
    return []
  }
  return [...list[1].matchAll(/<a href="([^"]*)"/gi)].map(([, href]) => href)
}
