import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * A normalised, diffable structural model of a rendered GDS page: headings,
 * captions, field order, labels and hints, option lists, summary rows, task
 * lists, buttons and links.
 *
 * The point is comparability. Two codebases rendering the same journey produce
 * comparable JSON, so a plain diff is the UI delta — and that diff is what the
 * parity report's findings, anchors and insertion points are all derived from.
 *
 * This runs in the browser. It has no imports and no closure over anything in
 * this file, because Playwright serialises it and evaluates it in the page.
 *
 * The comparison's other side runs a function that must produce the same shape.
 * The guarantee is a shared schema rather than a shared file — `tim parity`
 * parses every model on both sides through one definition — because the two
 * sides live in different repos and a copied file drifts silently where a
 * failing contract test does not.
 *
 * @returns {object}
 */
export const EXTRACTOR = () => {
  const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null)

  const main = document.querySelector('main') || document.body

  const closestLabelText = (input) => {
    if (input.id) {
      const label = document.querySelector(
        `label[for="${CSS.escape(input.id)}"]`
      )
      if (label) return text(label)
    }
    const wrapping = input.closest('label')
    return wrapping ? text(wrapping) : null
  }

  const hintFor = (el) => {
    const described = (el.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .filter((node) => node.classList.contains('govuk-hint'))
    if (described.length) return described.map(text).join(' ')
    const group = el.closest('.govuk-form-group')
    const hint = group ? group.querySelector(':scope > .govuk-hint') : null
    return text(hint)
  }

  const OPTION_TYPES = new Set(['radio', 'checkbox'])

  const fieldsFrom = (scope) => {
    const out = []
    const seenGroups = new Set()

    scope.querySelectorAll('input, select, textarea').forEach((el) => {
      const type = (
        el.getAttribute('type') || el.tagName.toLowerCase()
      ).toLowerCase()
      if (type === 'submit' || type === 'button') return

      if (OPTION_TYPES.has(type)) {
        const key = `${type}:${el.name}`
        if (seenGroups.has(key)) return
        seenGroups.add(key)
        const siblings = [
          ...scope.querySelectorAll(
            `input[type="${type}"][name="${CSS.escape(el.name)}"]`
          )
        ]
        const fieldset = el.closest('fieldset')
        out.push({
          kind: type === 'radio' ? 'radios' : 'checkboxes',
          name: el.name,
          legend: text(fieldset ? fieldset.querySelector('legend') : null),
          hint: hintFor(el.closest('.govuk-radios, .govuk-checkboxes') || el),
          options: siblings.map((s) => ({
            value: s.value,
            label: closestLabelText(s),
            hint: hintFor(s),
            conditional: !!(
              s.getAttribute('data-aria-controls') ||
              s.getAttribute('aria-controls')
            )
          }))
        })
        return
      }

      if (type === 'hidden') {
        out.push({ kind: 'hidden', name: el.name })
        return
      }

      if (el.tagName.toLowerCase() === 'select') {
        out.push({
          kind: 'select',
          name: el.name,
          label: closestLabelText(el),
          hint: hintFor(el),
          options: [...el.options].map((o) => ({
            value: o.value,
            label: text(o)
          }))
        })
        return
      }

      out.push({
        kind:
          el.tagName.toLowerCase() === 'textarea'
            ? 'textarea'
            : `input:${type}`,
        name: el.name,
        label: closestLabelText(el),
        hint: hintFor(el),
        autocomplete: el.getAttribute('autocomplete') || null,
        inputmode: el.getAttribute('inputmode') || null
      })
    })

    return out
  }

  const summaryLists = [...main.querySelectorAll('.govuk-summary-list')].map(
    (list) => ({
      card: text(
        list
          .closest('.govuk-summary-card')
          ?.querySelector('.govuk-summary-card__title')
      ),
      rows: [...list.querySelectorAll('.govuk-summary-list__row')].map(
        (row) => ({
          key: text(row.querySelector('.govuk-summary-list__key')),
          value: text(row.querySelector('.govuk-summary-list__value')),
          actions: [
            ...row.querySelectorAll('.govuk-summary-list__actions a')
          ].map((a) => ({
            text: text(a),
            href: a.getAttribute('href')
          }))
        })
      )
    })
  )

  const taskLists = [...main.querySelectorAll('.govuk-task-list')].map(
    (list) => ({
      items: [...list.querySelectorAll('.govuk-task-list__item')].map(
        (item) => ({
          title: text(item.querySelector('.govuk-task-list__name-and-hint')),
          href: item.querySelector('a')?.getAttribute('href') || null,
          status: text(item.querySelector('.govuk-task-list__status'))
        })
      )
    })
  )

  // Bespoke card patterns (dashboard notification/template/glance cards) use
  // app-* classes and raw dl/dt/dd rather than a govuk-summary-list.
  const cards = [
    ...main.querySelectorAll(
      'article, .app-dr2-dashboard-glance-card, [class*="-card"]'
    )
  ]
    .filter(
      (el, i, all) =>
        all.indexOf(el) === i && !el.closest('[class*="-card"]:not(:scope)')
    )
    .map((card) => ({
      classes: card.className,
      headings: [
        ...card.querySelectorAll(
          'h2, h3, h4, p[class*="__category"], p[class*="__title"]'
        )
      ].map(text),
      fields: [...card.querySelectorAll('dt')].map((dt) => ({
        key: text(dt),
        value: text(
          dt.parentElement?.querySelector('dd') || dt.nextElementSibling
        )
      })),
      tags: [
        ...card.querySelectorAll('.govuk-tag, [class*="status-text"]')
      ].map(text),
      actions: [...card.querySelectorAll('a')].map((a) => ({
        text: text(a),
        href: a.getAttribute('href')
      }))
    }))

  // The two codebases build the same UI concepts from different markup: the frontend
  // uses the govuk-frontend components, while the prototype's spine screens
  // (notification-hub, review-notification) use bespoke app-* structures. Comparing
  // `taskLists` to `taskLists` across sides therefore reads as "one side has no task
  // list at all", which is a false finding on the two most important screens.
  //
  // These three keys capture the concept rather than the component, so a diff
  // compares what the user sees rather than which macro rendered it.

  const uniqueNodes = (selector) => {
    const seen = new Set()
    for (const node of main.querySelectorAll(selector)) {
      if (![...seen].some((other) => other.contains(node))) seen.add(node)
    }
    return [...seen]
  }

  const taskItems = uniqueNodes(
    '.govuk-task-list__item, [class*="tasklist"] li, [class*="task-list"] li'
  ).map((item) => ({
    title: text(
      item.querySelector(
        '.govuk-task-list__name-and-hint, [class*="__name"], [class*="__title"], a, h2, h3'
      )
    ),
    href: item.querySelector('a')?.getAttribute('href') || null,
    status: text(
      item.querySelector(
        '.govuk-task-list__status, .govuk-tag, [class*="status"]'
      )
    )
  }))

  const summaryRows = [
    ...[...main.querySelectorAll('.govuk-summary-list__row')].map((row) => ({
      key: text(row.querySelector('.govuk-summary-list__key')),
      value: text(row.querySelector('.govuk-summary-list__value')),
      source: 'govuk-summary-list'
    })),
    // Raw definition lists outside a govuk-summary-list — the prototype's review cards.
    ...[...main.querySelectorAll('dl')]
      .filter((dl) => !dl.closest('.govuk-summary-list'))
      .flatMap((dl) =>
        [...dl.querySelectorAll('dt')].map((dt) => ({
          key: text(dt),
          value: text(
            dt.parentElement?.querySelector('dd') || dt.nextElementSibling
          ),
          source: 'definition-list'
        }))
      )
  ]

  // Controls are not always inside a <form> — the prototype's dashboard sort select
  // sits outside one — so walking forms alone silently loses them.
  const allFields = fieldsFrom(main)

  const tables = [...main.querySelectorAll('table')].map((table) => ({
    caption: text(table.querySelector('caption')),
    head: [...table.querySelectorAll('thead th')].map(text),
    rowCount: table.querySelectorAll('tbody tr').length,
    firstRow: [...(table.querySelector('tbody tr')?.children || [])].map(text)
  }))

  return {
    url: location.pathname + location.search,
    title: document.title.replace(/\s+/g, ' ').trim(),
    h1: text(main.querySelector('h1')),
    caption: text(
      main.querySelector(
        '.govuk-caption-xl, .govuk-caption-l, .govuk-caption-m'
      )
    ),
    backLink: text(document.querySelector('.govuk-back-link')),
    serviceNav: [
      ...document.querySelectorAll(
        '.govuk-service-navigation__link, .govuk-header__navigation-item a'
      )
    ].map((a) => ({ text: text(a), href: a.getAttribute('href') })),
    phaseBanner: text(document.querySelector('.govuk-phase-banner__content')),
    notificationBanners: [
      ...main.querySelectorAll('.govuk-notification-banner')
    ].map((b) => ({
      title: text(b.querySelector('.govuk-notification-banner__title')),
      body: text(b.querySelector('.govuk-notification-banner__content'))
    })),
    errorSummary: {
      title: text(main.querySelector('.govuk-error-summary__title')),
      items: [...main.querySelectorAll('.govuk-error-summary__list li')].map(
        text
      )
    },
    headings: [...main.querySelectorAll('h1, h2, h3, h4')].map((h) => ({
      level: h.tagName.toLowerCase(),
      text: text(h)
    })),
    paragraphs: [
      ...main.querySelectorAll('p.govuk-body, p.govuk-body-l, p.govuk-body-s')
    ].map(text),
    insetText: [...main.querySelectorAll('.govuk-inset-text')].map(text),
    warningText: [...main.querySelectorAll('.govuk-warning-text__text')].map(
      text
    ),
    details: [...main.querySelectorAll('.govuk-details')].map((d) => ({
      summary: text(d.querySelector('.govuk-details__summary-text')),
      body: text(d.querySelector('.govuk-details__text'))
    })),
    tags: [...main.querySelectorAll('.govuk-tag')].map((t) => ({
      text: text(t),
      classes: t.className.replace('govuk-tag', '').trim()
    })),
    forms: [...main.querySelectorAll('form')].map((form) => ({
      method: (form.getAttribute('method') || 'get').toLowerCase(),
      action: form.getAttribute('action'),
      fields: fieldsFrom(form),
      buttons: [...form.querySelectorAll('button, input[type="submit"]')].map(
        (b) => ({
          text: text(b) || b.value,
          name: b.getAttribute('name'),
          value: b.getAttribute('value'),
          classes: b.className
        })
      )
    })),
    summaryLists,
    taskLists,
    taskItems,
    summaryRows,
    allFields,
    cards,
    tables,
    links: [...main.querySelectorAll('a')]
      .filter((a) => !a.classList.contains('govuk-back-link'))
      .map((a) => ({
        text: text(a),
        href: a.getAttribute('href'),
        isButton: a.classList.contains('govuk-button')
      })),
    lists: [...main.querySelectorAll('ul.govuk-list, ol.govuk-list')].map(
      (ul) => [...ul.querySelectorAll(':scope > li')].map(text)
    )
  }
}

/**
 * Read one screen's page model and write it where the differ reads models
 * from.
 *
 * Written into the miner's directory rather than beside the screenshots,
 * because that is the path `compare/diff-all.js` reads and the deltas it
 * produces feed the anchors, the insertion points and the findings. A model
 * captured somewhere the differ does not look is a model nothing uses.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} screen - Screen id, matching the corpus (for example fe-hub)
 * @param {string} [dir] - Override the destination
 * @returns {Promise<object>} The manifest row fragment
 */
export const capturePageModel = async (page, screen, dir = modelDir()) => {
  const model = await page.evaluate(EXTRACTOR)
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${screen}.json`)
  writeFileSync(file, `${stable(model)}\n`, 'utf8')
  return {
    fields: (model.allFields ?? []).length,
    headings: (model.headings ?? []).length,
    file
  }
}

/**
 * The generated notification reference and the journey id change on every run.
 * Left in, every model differs from the last capture, every delta churns, and
 * the anchors and insertion points derived from those deltas churn with them —
 * so a real change would arrive buried in noise nobody reads.
 *
 * This is the page-model equivalent of masking a volatile region before a
 * screenshot, and it is done on the serialised text so it reaches every href,
 * value and heading at once.
 */
const VOLATILE = [
  [/GBN-[A-Z]{2}-\d{2}-[A-Z0-9]{6,}/g, 'GBN-XX-00-REFERENCE'],
  [/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'UUID']
]

export const stable = (model) =>
  VOLATILE.reduce(
    (json, [pattern, replacement]) => json.replace(pattern, replacement),
    JSON.stringify(model, null, 2)
  )

export const modelDir = () =>
  process.env.FIT_MODEL_DIR ??
  join(
    process.env.HOME,
    'git/defra/trade-imports-workspace/workareas/shared/dr21-parity/fe-miner/capture/model'
  )
