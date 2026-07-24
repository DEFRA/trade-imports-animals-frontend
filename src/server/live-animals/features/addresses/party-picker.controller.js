import { pagePath, pageRoutePath, TEMPLATES } from '../../config.js'
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

const HTTP_STATUS_BAD_REQUEST = 400

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

const resultsHref = (journeyId, party, { query, page, selectedId }) => {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  params.set('page', String(page))
  if (selectedId) params.set('selected', selectedId)
  return `${pagePath(journeyId, party.slug)}?${params.toString()}`
}

const numbersToShow = (page, totalPages) => {
  const shown = [1, page - 1, page, page + 1, totalPages].filter(
    (number) => number >= 1 && number <= totalPages
  )
  return [...new Set(shown)].sort((a, b) => a - b)
}

const itemsWithEllipses = (numbers, page, hrefFor) =>
  numbers.reduce(
    (acc, number) => {
      const items =
        number - acc.last > 1 ? [...acc.items, { ellipsis: true }] : acc.items
      return {
        items: [
          ...items,
          { number, href: hrefFor(number), current: number === page }
        ],
        last: number
      }
    },
    { items: [], last: 0 }
  ).items

const paginationItems = (page, totalPages, hrefFor) =>
  itemsWithEllipses(numbersToShow(page, totalPages), page, hrefFor)

const pagination = (
  journeyId,
  party,
  { query, page, totalPages, selectedId }
) => {
  if (totalPages < 2) return null
  const hrefFor = (number) =>
    resultsHref(journeyId, party, {
      query,
      page: number,
      selectedId
    })
  return {
    previous: page > 1 ? { href: hrefFor(page - 1) } : undefined,
    next: page < totalPages ? { href: hrefFor(page + 1) } : undefined,
    items: paginationItems(page, totalPages, hrefFor)
  }
}

/** The committed answer is a COPY of the record (name + address, no id),
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
      backLink: pagePath(journey.journeyId, 'addresses'),
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
      createAddressHref: pagePath(
        journey.journeyId,
        `${CREATE_ADDRESS_SLUG}?for=${party.id}`
      ),
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
      pagination: pagination(journey.journeyId, party, {
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

const isSearchAction = (payload) => payload.action === 'search'

// A row ticked on THIS page wins; otherwise the hidden field carries the
// selection made on an earlier page or search (no-JS safe across pagination).
const chosenPartyFor = (party, selectedId) =>
  selectedId ? addressBook.party(party.role, selectedId) : undefined

const commitSelection = async (request, h, party, chosen) => {
  await state.commit(request, h, {
    [party.id]: { name: chosen.name, address: { ...chosen.address } }
  })
  return h.redirect(pagePath(request.params.journeyId, 'addresses'))
}

const post = (party) => async (request, h) => {
  const payload = request.payload ?? {}
  const query = payload.q ?? ''
  const selectedId = payload.party || payload.selected || ''

  if (isSearchAction(payload)) {
    const { journey } = await state.get(request, h)
    return render(h, journey, party, { query, page: 1, selectedId })
  }

  const chosen = chosenPartyFor(party, selectedId)
  if (!chosen) {
    const { journey } = await state.get(request, h)
    return render(h, journey, party, {
      query,
      page: pageNumber(payload.page),
      selectedId: '',
      error: party.error
    }).code(HTTP_STATUS_BAD_REQUEST)
  }

  return commitSelection(request, h, party, chosen)
}

export const routes = PARTIES.flatMap((party) => [
  {
    method: 'GET',
    path: pageRoutePath(party.slug),
    options: open,
    handler: get(party)
  },
  {
    method: 'POST',
    path: pageRoutePath(party.slug),
    options: open,
    handler: post(party)
  }
])
