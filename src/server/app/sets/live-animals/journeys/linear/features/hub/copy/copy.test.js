import { SET_BASE, SET_ID } from '../../../../../set.js'
import { beforeAll, beforeEach, describe, expect, it, test } from 'vitest'

import { buildDispatch } from '../../../../../../../flow/dispatch.js'
import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import {
  stubH,
  journeyRequest
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'
import { leaves, isCopyLeaf } from '../../../../../../../shared/copy-leaves.js'
import { dashboardPath, pagePath } from '../../../../../../../shared/paths.js'

import { routes } from '../controller.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'

const hubHandler = routes.find((route) => route.method === 'GET').handler

const renderHub = async (seed = {}) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, seed)
  const h = stubH()
  await hubHandler(journeyRequest(journey.journeyId), h)
  return { ...h.captured.view.context, journeyId: journey.journeyId }
}

const allItems = (context) => context.groups.flatMap((group) => group.items)

const rowByTitle = (context, title) =>
  allItems(context).find((item) => item.title.text === title)

const unlockedSeed = {
  countryOfOrigin: 'FR',
  commodityLines: [{ commoditySelection: 'Cat' }]
}

const ORIGIN_ROW_TITLE = 'Where is this consignment coming from?'
const COMMODITIES_ROW_TITLE = 'What are you importing?'
const CONSIGNMENT_DETAILS_ROW_TITLE = 'Commodity details'
const IMPORT_REASON_ROW_TITLE = 'Main reason for import'
const TRANSIT_ROW_TITLE = 'Transit countries'
const ARRIVAL_ROW_TITLE = 'Arrival details'
const ADDRESSES_ROW_TITLE = 'Roles and addresses'
// The one hint Design release 1 shows on the hub, on the addresses row.
const ADDRESSES_ROW_HINT =
  'Consignor or Exporter, Consignee, Importer and Place of Destination'
const ADDRESSES_ROW_HINT_CY =
  'Anfonwr neu allforiwr, derbynnydd, mewnforiwr a man cyrchfan'
const CANNOT_START_CLASS = 'govuk-task-list__status--cannot-start-yet'

// Anchored at the set base, not at `/notifications`: a row whose href lost or
// doubled the set prefix would otherwise still match and pass.
const A_JOURNEY_PAGE_URL = new RegExp(`^${SET_BASE}/notifications/[^/]+/.+`)
// Design release 1 has two task statuses and no more: "To do" in blue and
// "Complete" in green.
const TO_DO_STATUS = {
  tag: { text: 'To do', classes: 'govuk-tag--blue' }
}
const COMPLETE_STATUS = {
  tag: { text: 'Complete', classes: 'govuk-tag--green' }
}
const DESIGN_STATUSES = [TO_DO_STATUS, COMPLETE_STATUS]

// Temporary admission of horses is the one reason that opens both a port of
// exit and an exit date under it — the state the retired "Exit details" task
// used to appear in.
const temporaryAdmissionSeed = {
  ...unlockedSeed,
  reasonForImport: 'temporaryAdmissionHorses',
  portOfExit: 'GB DVR'
}
const EXIT_DATE = { day: '20', month: '12', year: '2026' }

describe('#copy', () => {
  test('Should have a non-empty string or copy function at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      expect(isCopyLeaf(value), `${path} must be copy`).toBe(true)
    }
  })

  test('Should head the whole task list "Notification tasklist"', () => {
    expect(copy.taskListHeading).toBe('Notification tasklist')
  })

  // Design release 1 keeps the hub to one-line rows: only "Roles and
  // addresses" carries a sentence underneath, naming the four parties that row
  // collects.
  test('Should give a hint to the roles and addresses row alone', () => {
    const hinted = Object.entries(copy.rows)
      .filter(([, row]) => row.hint !== undefined)
      .map(([id]) => id)

    expect(hinted).toEqual(['addresses'])
    expect(copy.rows.addresses.hint).toBe(ADDRESSES_ROW_HINT)

    // Copy parity only checks that a Welsh leaf differs from its English
    // counterpart, so the Welsh parties list is pinned here beside the English
    // one.
    const hintedCy = Object.entries(copyCy.rows)
      .filter(([, row]) => row.hint !== undefined)
      .map(([id]) => id)

    expect(hintedCy).toEqual(['addresses'])
    expect(copyCy.rows.addresses.hint).toBe(ADDRESSES_ROW_HINT_CY)
  })

  // The English row titles are pinned exhaustively by the rendered-row table
  // in 'GET /hub', but copy parity only checks that a Welsh leaf differs from
  // its English counterpart, so the Welsh titles are pinned here the same way
  // the Welsh parties hint above is. Design release 1 wording, both locales.
  test('Should pin the Welsh row titles', () => {
    const titlesCy = Object.fromEntries(
      Object.entries(copyCy.rows).map(([id, row]) => [id, row.title])
    )

    expect(titlesCy).toEqual({
      origin: 'O ble mae’r llwyth hwn yn dod?',
      commodities: 'Beth ydych chi’n ei fewnforio?',
      importReason: 'Prif reswm dros fewnforio',
      consignmentDetails: 'Manylion y nwyddau',
      additionalDetails: 'Manylion ychwanegol',
      animalIdentification: 'Manylion adnabod',
      arrivalDetails: 'Manylion cyrraedd',
      transitCountries: 'Gwledydd tramwy',
      transporter: 'Manylion cludo',
      addresses: 'Rolau a chyfeiriadau',
      contact: 'Cyfeiriad cyswllt ar gyfer y llwyth hwn',
      documents: 'Uwchlwytho dogfennau'
    })
  })
})

describe('GET /hub', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  test('Should supply the feature copy module and the shared chrome copy', async () => {
    const journey = await store.create()
    const h = stubH()
    const handler = routes.find((route) => route.method === 'GET').handler
    await handler(journeyRequest(journey.journeyId), h)
    const { context } = h.captured.view
    expect(context.copy).toBe(copy)
    expect(context.pageTitle).toBe(copy.title)
    expect(context.sharedCopy.layout.serviceName).toBe(
      'Import notification service'
    )
    expect(context.groups.map((group) => group.caption)).toEqual(
      Object.values(copy.groups)
    )
  })
})

describe('#hubHandler', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should title the hub Overview with the design chrome — Return to dashboard, no back link, no breadcrumbs, no progress line', async () => {
    const context = await renderHub()
    expect(context.heading).toBe('Overview')
    expect(context.pageTitle).toBe('Overview')
    expect(context.dashboardHref).toBe(dashboardPath())
    expect(context.backLink).toBeUndefined()
    expect(context.breadcrumbs).toBeUndefined()
    expect(context.progressLine).toBeUndefined()
  })

  it('Should render the six numbered design sections in order and nothing after them', async () => {
    const { groups } = await renderHub()
    expect(groups.map((group) => group.caption)).toEqual([
      '1. About the consignment',
      '2. Description of the goods',
      '3. Transport and arrival',
      '4. Documents',
      '5. Consignment parties',
      '6. Contact address'
    ])
  })

  it('Should render the eleven page-level rows in their groups on an unlocked journey (transit stays absent)', async () => {
    const { groups } = await renderHub(unlockedSeed)
    expect(
      groups.map((group) => group.items.map((item) => item.title.text))
    ).toEqual([
      [ORIGIN_ROW_TITLE, COMMODITIES_ROW_TITLE, IMPORT_REASON_ROW_TITLE],
      // Design release 1 asks for the identifiers before the certifications,
      // which is the order the opening run visits the two pages in too.
      [
        CONSIGNMENT_DETAILS_ROW_TITLE,
        'Identification details',
        'Additional details'
      ],
      [ARRIVAL_ROW_TITLE, 'Transport details'],
      ['Upload documents'],
      [ADDRESSES_ROW_TITLE],
      ['Contact address for this consignment']
    ])
  })

  it('Should hold "About the consignment" at three rows once a reason opens its exit questions', async () => {
    const { groups } = await renderHub({
      ...temporaryAdmissionSeed,
      exitDate: EXIT_DATE
    })
    expect(groups[0].items.map((item) => item.title.text)).toEqual([
      ORIGIN_ROW_TITLE,
      COMMODITIES_ROW_TITLE,
      IMPORT_REASON_ROW_TITLE
    ])
  })

  it('Should carry the exit questions in the import-reason row status rather than a task of their own', async () => {
    // Owing the exit date holds the row short of Complete. Design release 1
    // draws that with the plain "To do" it gives an untouched task — the row
    // is unfinished, and the hub says no more than that.
    const owingTheExitDate = await renderHub(temporaryAdmissionSeed)
    expect(
      rowByTitle(owingTheExitDate, IMPORT_REASON_ROW_TITLE).status
    ).toEqual(TO_DO_STATUS)

    const answered = await renderHub({
      ...temporaryAdmissionSeed,
      exitDate: EXIT_DATE
    })
    expect(rowByTitle(answered, IMPORT_REASON_ROW_TITLE).status).toEqual(
      COMPLETE_STATUS
    )
  })

  it('Should render the always-open origin row as a blue "To do" tag with a link', async () => {
    const context = await renderHub()
    const originRow = rowByTitle(context, ORIGIN_ROW_TITLE)
    expect(originRow.href).toBe(pagePath(context.journeyId, 'origin'))
    expect(originRow.status).toEqual(TO_DO_STATUS)
  })

  it('Should render a finished row as a green "Complete" tag', async () => {
    const originRow = rowByTitle(
      await renderHub({
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no'
      }),
      ORIGIN_ROW_TITLE
    )
    expect(originRow.status).toEqual(COMPLETE_STATUS)
  })

  // Design release 1 lets a trader start any task on the notification in any
  // order, so every task the hub shows is a link with a real status from the
  // moment the notification exists. With the review moved to a button, no row
  // on the page is ever shut.
  it('Should link every row on a brand new notification, none of them "Cannot start yet"', async () => {
    const context = await renderHub()
    const rows = allItems(context)

    expect(rows).not.toHaveLength(0)
    for (const row of rows) {
      expect(row.href, `${row.title.text} has no way in`).toMatch(
        A_JOURNEY_PAGE_URL
      )
      expect(row.status.classes, `${row.title.text} is shut`).not.toBe(
        CANNOT_START_CLASS
      )
    }
  })

  it('Should open each row at its own page before anything else is answered', async () => {
    const context = await renderHub()

    expect(rowByTitle(context, COMMODITIES_ROW_TITLE).href).toBe(
      pagePath(context.journeyId, 'commodities')
    )
    expect(rowByTitle(context, CONSIGNMENT_DETAILS_ROW_TITLE).href).toBe(
      pagePath(context.journeyId, 'consignment-details')
    )
    expect(rowByTitle(context, ARRIVAL_ROW_TITLE).href).toBe(
      pagePath(context.journeyId, 'port-of-entry')
    )
    expect(
      rowByTitle(context, 'Contact address for this consignment').href
    ).toBe(pagePath(context.journeyId, 'consignment/contact/select'))
  })

  it('Should split the commodities and identification rows over one collection — line data completes one, identifiers the other', async () => {
    const cowLine = {
      commoditySelection: 'Cow',
      speciesSelection: '1148346',
      commodityType: '16',
      numberOfPackages: '5',
      numberOfAnimalsQuantity: '25'
    }
    const context = await renderHub({
      countryOfOrigin: 'FR',
      // Two identified species, so the identification row has work to show.
      // On one species the service asks for no identifier at all.
      commodityLines: [
        cowLine,
        {
          commoditySelection: 'Horse',
          speciesSelection: '822332',
          commodityType: '2',
          numberOfPackages: '3',
          numberOfAnimalsQuantity: '4'
        }
      ]
    })
    expect(rowByTitle(context, COMMODITIES_ROW_TITLE).status).toEqual(
      COMPLETE_STATUS
    )
    const identificationRow = rowByTitle(context, 'Identification details')
    expect(identificationRow.status).toEqual(TO_DO_STATUS)
    expect(identificationRow.href).toBe(
      pagePath(context.journeyId, 'commodities/identification')
    )
  })

  it('Should show the conditional transit row only for an overland means of transport', async () => {
    const withoutMeans = await renderHub(unlockedSeed)
    expect(rowByTitle(withoutMeans, TRANSIT_ROW_TITLE)).toBeUndefined()

    const byAir = await renderHub({
      ...unlockedSeed,
      meansOfTransport: 'AIRPLANE'
    })
    expect(rowByTitle(byAir, TRANSIT_ROW_TITLE)).toBeUndefined()

    const byRoad = await renderHub({
      ...unlockedSeed,
      meansOfTransport: 'ROAD_VEHICLE'
    })
    const transitRow = rowByTitle(byRoad, TRANSIT_ROW_TITLE)
    expect(transitRow.href).toBe(
      pagePath(byRoad.journeyId, 'transit-countries')
    )
    // The answer is optional, but Design release 1 does not say so on the hub:
    // an untouched optional row carries the same "To do" tag as any other
    // untouched row.
    expect(transitRow.status).toEqual(TO_DO_STATUS)
  })

  it('Should tag the optional documents row "To do" like any other unfinished row', async () => {
    const documentsRow = rowByTitle(
      await renderHub(unlockedSeed),
      'Upload documents'
    )
    expect(documentsRow.status).toEqual(TO_DO_STATUS)
  })

  it('Should enter each movement row at its first page', async () => {
    const context = await renderHub(unlockedSeed)
    expect(rowByTitle(context, ARRIVAL_ROW_TITLE).href).toBe(
      pagePath(context.journeyId, 'port-of-entry')
    )
    expect(rowByTitle(context, 'Transport details').href).toBe(
      pagePath(context.journeyId, 'transporters')
    )
    expect(rowByTitle(context, ADDRESSES_ROW_TITLE).href).toBe(
      pagePath(context.journeyId, 'addresses')
    )
  })

  // Design release 1 reaches the review from a button under the task list, not
  // from a task row, and offers it on a notification with nothing answered:
  // the review page is where a trader reads back what they have entered so far.
  it('Should offer the review as a button under the list, not as a task row', async () => {
    const context = await renderHub()

    expect(context.reviewHref).toBe(
      pagePath(context.journeyId, 'notification-view')
    )
    expect(copy.reviewAndSubmit).toBe('Review and submit')
    expect(rowByTitle(context, 'Check and submit')).toBeUndefined()
    expect(copy.groups['check-and-submit']).toBeUndefined()
  })

  it('Should offer the same review button on a part-answered notification', async () => {
    const context = await renderHub(unlockedSeed)

    expect(context.reviewHref).toBe(
      pagePath(context.journeyId, 'notification-view')
    )
  })
})

describe('#hubHandler — the task statuses', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  // Design release 1 gives a task one of two statuses and has no third. A row
  // the engine holds part-answered, and one it holds optional, both read
  // "To do": the hub never tells a trader a task is half-done, and never tells
  // them on this page that a task can be left out.
  it('Should tag every row with one of the two design statuses, whatever is answered', async () => {
    const seeds = [
      {},
      unlockedSeed,
      temporaryAdmissionSeed,
      { ...temporaryAdmissionSeed, meansOfTransport: 'ROAD_VEHICLE' },
      { countryOfOrigin: 'FR', regionOfOriginCodeRequirement: 'no' }
    ]

    for (const seed of seeds) {
      const rows = allItems(await renderHub(seed))
      expect(rows).not.toHaveLength(0)
      for (const row of rows) {
        expect(
          DESIGN_STATUSES,
          `${row.title.text} is tagged ${JSON.stringify(row.status)}`
        ).toContainEqual(row.status)
      }
    }
  })

  it('Should hold the two design statuses in both locales', () => {
    expect(copy.statuses).toEqual({ complete: 'Complete', toDo: 'To do' })

    // Copy parity only checks that a Welsh leaf differs from its English
    // counterpart, so the Welsh statuses are pinned here beside the English
    // ones.
    expect(copyCy.statuses).toEqual({
      complete: 'Wedi’i gwblhau',
      toDo: 'I’w wneud'
    })
  })
})

describe('#hubHandler — the commodity totals', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should read both commodity totals as 0 on a journey with no commodity lines', async () => {
    expect((await renderHub()).commodityTotals).toEqual({
      animals: 0,
      packages: 0
    })
  })

  it('Should sum animals and packages over the commodity lines, treating blanks as 0', async () => {
    const { commodityTotals } = await renderHub({
      commodityLines: [
        {
          commoditySelection: 'Cow',
          numberOfAnimalsQuantity: '25',
          numberOfPackages: '5'
        },
        {
          commoditySelection: 'Cow',
          numberOfAnimalsQuantity: '3',
          numberOfPackages: ''
        },
        {
          commoditySelection: 'Cow',
          numberOfAnimalsQuantity: '',
          numberOfPackages: '2'
        }
      ]
    })
    expect(commodityTotals).toEqual({ animals: 28, packages: 7 })
  })
})

// Design release 1 gives the commodity details a task of their own, first
// under the second section, so a reader can tell whether the numbers and
// packages have been entered without opening the page.
describe('#hubHandler — the Commodity details row', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should lead the second group with a Commodity details row linking to the consignment-details page', async () => {
    const context = await renderHub({
      countryOfOrigin: 'FR',
      commodityLines: [{ commoditySelection: 'Cow' }]
    })
    const [firstItem] = context.groups[1].items

    expect(firstItem.title.text).toBe(CONSIGNMENT_DETAILS_ROW_TITLE)
    expect(firstItem.href).toBe(
      pagePath(context.journeyId, 'consignment-details')
    )
    expect(firstItem.status).toEqual(TO_DO_STATUS)
  })

  it('Should carry a status the commodities row does not answer for', async () => {
    const seedLine = (entry) => ({
      countryOfOrigin: 'FR',
      commodityLines: [
        {
          commoditySelection: 'Cow',
          speciesSelection: '1148346',
          commodityType: '16',
          ...entry
        }
      ]
    })

    const owingTheNumbers = await renderHub(seedLine({}))
    expect(rowByTitle(owingTheNumbers, COMMODITIES_ROW_TITLE).status).toEqual(
      COMPLETE_STATUS
    )
    expect(
      rowByTitle(owingTheNumbers, CONSIGNMENT_DETAILS_ROW_TITLE).status
    ).toEqual(TO_DO_STATUS)

    const answered = await renderHub(
      seedLine({ numberOfPackages: '5', numberOfAnimalsQuantity: '25' })
    )
    expect(rowByTitle(answered, CONSIGNMENT_DETAILS_ROW_TITLE).status).toEqual(
      COMPLETE_STATUS
    )
  })
})

// Design release 1 keeps the hub to one-line rows, so a row without a hint
// gets no hint slot at all — handing govukTaskList `{ text: undefined }` would
// still draw an empty hint element under every task.
describe('#hubHandler — the row hints', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should build a hint slot on the roles and addresses row alone', async () => {
    // Overland transport, so the conditional transit row is on the list too
    // and every row the hub can show is under test.
    const context = await renderHub({
      ...unlockedSeed,
      meansOfTransport: 'ROAD_VEHICLE'
    })

    expect(
      allItems(context)
        .filter((item) => item.hint !== undefined)
        .map((item) => item.title.text)
    ).toEqual([ADDRESSES_ROW_TITLE])
    expect(rowByTitle(context, ADDRESSES_ROW_TITLE).hint).toEqual({
      text: ADDRESSES_ROW_HINT
    })
  })
})

// Temporary admission of horses makes a port of exit and an exit date
// compulsory, and once a trader has answered them and moved on, the hub is
// their only way back to change an answer. Design release 1 asks both under
// "Main reason for import", so that row carries the return route.
describe('#hubHandler — the way back to the exit questions', () => {
  beforeAll(() => {
    configureRecords(SET_ID, recordsStub)
    configureSession(SET_ID, sessionStub)
    buildDispatch(SET_ID, dispatchPages)
  })
  beforeEach(() => store.clear())

  it('Should open the import-reason page from its row while the exit date is still owing', async () => {
    const context = await renderHub(temporaryAdmissionSeed)

    expect(rowByTitle(context, IMPORT_REASON_ROW_TITLE).href).toBe(
      pagePath(context.journeyId, 'import-reason')
    )
  })

  it('Should still link that row once both exit questions are answered', async () => {
    const context = await renderHub({
      ...temporaryAdmissionSeed,
      exitDate: EXIT_DATE
    })

    expect(rowByTitle(context, IMPORT_REASON_ROW_TITLE).href).toBe(
      pagePath(context.journeyId, 'import-reason')
    )
  })

  it('Should leave no row on that hub without a way in', async () => {
    const rows = allItems(await renderHub(temporaryAdmissionSeed))

    expect(rows).not.toHaveLength(0)
    for (const row of rows) {
      expect(row.href, `${row.title.text} has no way in`).toMatch(
        A_JOURNEY_PAGE_URL
      )
    }
  })
})
