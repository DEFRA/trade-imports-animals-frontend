import { createDraft, findQuote, updateQuote } from '../shared/store.js'
import {
  fieldsToView,
  collectFields,
  errorSummaryList
} from '../shared/fields.js'
import { pages, pageBySlug, errorFields, allFields } from './pages.js'

const BASE = '/prototype/input-types'
const open = { auth: false }

const at = (id, suffix) => `${BASE}/${id}/${suffix}`
const order = pages.map((page) => page.slug)

function afterPage(slug) {
  const next = order[order.indexOf(slug) + 1]
  return next ?? 'advanced'
}

function backForPage(quoteId, slug) {
  const index = order.indexOf(slug)
  return index <= 0 ? BASE : at(quoteId, order[index - 1])
}

function display(field, quote) {
  const value = quote[field.name]
  if (field.kind === 'date') {
    return value && value.day
      ? `${value.day}/${value.month}/${value.year}`
      : 'Not provided'
  }
  if (field.kind === 'checkboxes') {
    return value && value.length ? value.join(', ') : 'None'
  }
  if (value === undefined || value === '') {
    return 'Not provided'
  }
  return field.kind === 'currency' ? `£${value}` : value
}

function reviewRows(quote) {
  const rows = allFields.map((field) => ({
    key: { text: field.label },
    value: { text: display(field, quote) }
  }))
  rows.push(
    {
      key: { text: 'How did you hear about us?' },
      value: { text: quote.heardFrom ?? 'Not provided' }
    },
    {
      key: { text: 'Make of vehicle' },
      value: { text: quote.vehicleMake ?? 'Not provided' }
    }
  )
  return rows
}

/**
 * Input types reference prototype — a journey exercising every GDS input
 * component, as a worked example. Registered only when prototypes are enabled.
 */
export const inputTypesPrototype = {
  plugin: {
    name: 'prototype-input-types',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: BASE,
          options: open,
          handler(_request, h) {
            return h.view('input-types/start', {
              pageTitle: 'Input types reference'
            })
          }
        },
        {
          method: 'POST',
          path: `${BASE}/start`,
          options: open,
          handler(_request, h) {
            const draft = createDraft('input-types')
            return h.redirect(at(draft.id, order[0]))
          }
        },
        {
          method: 'GET',
          path: `${BASE}/{id}/advanced`,
          options: open,
          handler(request, h) {
            const quote = findQuote(request.params.id)
            if (!quote) {
              return h.redirect(BASE)
            }
            return h.view('input-types/advanced', {
              pageTitle: 'Advanced inputs',
              quote,
              backLink: at(quote.id, order[order.length - 1])
            })
          }
        },
        {
          method: 'POST',
          path: `${BASE}/{id}/advanced`,
          options: open,
          handler(request, h) {
            const quote = findQuote(request.params.id)
            if (!quote) {
              return h.redirect(BASE)
            }
            updateQuote(quote.id, {
              heardFrom: request.payload.heardFrom,
              contactOther: request.payload.contactOther,
              vehicleMake: request.payload.vehicleMake
            })
            return h.redirect(at(quote.id, 'errors'))
          }
        },
        {
          method: 'GET',
          path: `${BASE}/{id}/errors`,
          options: open,
          handler(request, h) {
            const quote = findQuote(request.params.id)
            if (!quote) {
              return h.redirect(BASE)
            }
            return h.view('input-types/errors', {
              pageTitle: 'Validation and error states',
              backLink: at(quote.id, 'advanced'),
              errorList: errorSummaryList(errorFields),
              fields: fieldsToView(errorFields, {}),
              continueHref: at(quote.id, 'review')
            })
          }
        },
        {
          method: 'GET',
          path: `${BASE}/{id}/review`,
          options: open,
          handler(request, h) {
            const quote = findQuote(request.params.id)
            if (!quote) {
              return h.redirect(BASE)
            }
            return h.view('input-types/review', {
              pageTitle: 'What you entered',
              backLink: at(quote.id, 'errors'),
              rows: reviewRows(quote)
            })
          }
        },
        {
          method: 'GET',
          path: `${BASE}/{id}/{slug}`,
          options: open,
          handler(request, h) {
            const quote = findQuote(request.params.id)
            if (!quote) {
              return h.redirect(BASE)
            }
            const page = pageBySlug.get(request.params.slug)
            if (!page) {
              return h.redirect(at(quote.id, order[0]))
            }
            return h.view('input-types/page', {
              pageTitle: page.title,
              fields: fieldsToView(page.fields, quote),
              backLink: backForPage(quote.id, page.slug),
              quote
            })
          }
        },
        {
          method: 'POST',
          path: `${BASE}/{id}/{slug}`,
          options: open,
          handler(request, h) {
            const quote = findQuote(request.params.id)
            if (!quote) {
              return h.redirect(BASE)
            }
            const page = pageBySlug.get(request.params.slug)
            if (!page) {
              return h.redirect(at(quote.id, order[0]))
            }
            updateQuote(quote.id, collectFields(page.fields, request.payload))
            return h.redirect(at(quote.id, afterPage(page.slug)))
          }
        }
      ])
    }
  }
}
