import { pagePath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { open } from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import { copy as sharedEn } from '../../shared/copy.en.js'
import { copy as sharedCy } from '../../shared/copy.cy.js'
import * as addressBook from '../../services/address-book/index.js'
import { CREATE_ADDRESS_SLUG } from './create-address.controller.js'
import { PARTIES } from './parties.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

const view = `${TEMPLATES}/features/addresses/party-picker`

const copy = copyFor({ en, cy }).picker
const sharedCopy = copyFor({ en: sharedEn, cy: sharedCy })

const ADDRESS_PARTS = [
  'addressLine1',
  'addressLine2',
  'addressLine3',
  'townOrCity',
  'county',
  'postalOrZipCode'
]

const addressText = (address) =>
  ADDRESS_PARTS.map((part) => address[part])
    .filter((part) => part)
    .join(', ')

const detailLines = (record) =>
  [
    record.name,
    ...ADDRESS_PARTS.map((part) => record.address[part]),
    record.address.country,
    record.address.telephoneNumber,
    record.address.emailAddress
  ].filter((line) => line)

const resultsHref = (party, { query, page, selectedId }) => {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  params.set('page', String(page))
  if (selectedId) params.set('selected', selectedId)
  return `${pagePath(party.slug)}?${params.toString()}`
}

/** GDS pagination: first, last, the current page and its neighbours, with an
 * ellipsis wherever the run of numbers breaks. */
const paginationItems = (page, totalPages, hrefFor) => {
  const shown = [1, page - 1, page, page + 1, totalPages].filter(
    (number) => number >= 1 && number <= totalPages
  )
  const items = []
  let last = 0
  for (const number of [...new Set(shown)].sort((a, b) => a - b)) {
    if (number - last > 1) items.push({ ellipsis: true })
    items.push({ number, href: hrefFor(number), current: number === page })
    last = number
  }
  return items
}

const pagination = (party, { query, page, totalPages, selectedId }) => {
  if (totalPages < 2) return null
  const hrefFor = (number) =>
    resultsHref(party, { query, page: number, selectedId })
  return {
    previous: page > 1 ? { href: hrefFor(page - 1) } : undefined,
    next: page < totalPages ? { href: hrefFor(page + 1) } : undefined,
    items: paginationItems(page, totalPages, hrefFor)
  }
}

/** The committed answer is a COPY of the record (name + address, no id — c-020),
 * so the picker re-finds the record it came from by name to pre-check its row. */
const committedId = (answers, party) =>
  addressBook
    .parties(party.role)
    .find((record) => record.name === answers[party.id]?.name)?.id

const errorSummary = (error, hasRows) =>
  error
    ? {
        titleText: sharedCopy.errorSummary.title,
        errorList: [{ text: error, href: hasRows ? '#party' : '#q' }]
      }
    : null

const render = (h, journey, party, { query, page, selectedId, error }) => {
  const found = addressBook.search(party.role, { query, page })
  const selected = selectedId
    ? addressBook.party(party.role, selectedId)
    : undefined
  const from = (found.page - 1) * found.pageSize

  return h.view(view, {
    ...kit.base(party.title, {
      backLink: pagePath('addresses'),
      journey
    }),
    heading: party.title,
    description: party.hint,
    pickerCopy: copy,
    errorSummary: errorSummary(error, found.results.length > 0),
    picker: {
      query,
      page: found.page,
      error,
      selected,
      createAddressHref: pagePath(`${CREATE_ADDRESS_SLUG}?for=${party.id}`),
      resultsCaption: copy.resultsCaption(found.results.length, found.total),
      rows: found.results.map((record, index) => ({
        id: record.id,
        idPrefix: index === 0 ? 'party' : `party-${from + index + 1}`,
        name: record.name,
        addressText: addressText(record.address),
        country: record.address.country,
        detailLines: detailLines(record),
        checked: record.id === selectedId
      })),
      pagination: pagination(party, {
        query,
        page: found.page,
        totalPages: found.totalPages,
        selectedId
      })
    }
  })
}

const pageNumber = (value) => {
  const number = Number.parseInt(value ?? '1', 10)
  return Number.isNaN(number) ? 1 : number
}

const get = (party) => async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, party, {
    query: request.query.q ?? '',
    page: pageNumber(request.query.page),
    selectedId: request.query.selected ?? committedId(answers, party)
  })
}

const post = (party) => async (request, h) => {
  const payload = request.payload ?? {}
  const query = payload.q ?? ''
  // A row ticked on THIS page wins; otherwise the hidden field carries the
  // selection made on an earlier page or search (no-JS safe across pagination).
  const selectedId = payload.party || payload.selected || ''

  if (payload.action === 'search') {
    const { journey } = await state.get(request, h)
    return render(h, journey, party, { query, page: 1, selectedId })
  }

  const chosen = selectedId
    ? addressBook.party(party.role, selectedId)
    : undefined
  if (!chosen) {
    const { journey } = await state.get(request, h)
    return render(h, journey, party, {
      query,
      page: pageNumber(payload.page),
      selectedId: '',
      error: party.error
    })
  }

  await state.commit(request, h, {
    [party.id]: { name: chosen.name, address: { ...chosen.address } }
  })
  return h.redirect(pagePath('addresses'))
}

export const routes = PARTIES.flatMap((party) => [
  {
    method: 'GET',
    path: pagePath(party.slug),
    options: open,
    handler: get(party)
  },
  {
    method: 'POST',
    path: pagePath(party.slug),
    options: open,
    handler: post(party)
  }
])
