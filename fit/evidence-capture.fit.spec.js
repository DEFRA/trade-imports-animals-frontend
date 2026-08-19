import { expect, test } from '@playwright/test'

import {
  addDocument,
  completeAnswerSections,
  journeyIdFromPage,
  journeyUrl,
  startNotification,
  values
} from './live-animals-journey.js'
import { captureScreen, writeManifest } from './evidence/capture.js'

// Evidence capture for the findings report in the workspace. It is not a test:
// it asserts only that it reached the screen it says it reached, because a
// picture of the wrong page is worse than no picture.
//
// It runs only under the `evidence` Playwright project, which only exists when
// FIT_CAPTURE is set — so `test:fit:features`, `test:fit:journeys` and CI never
// see it.
//
// The screen ids are the corpus's, not this repo's. They are what joins a
// picture to a finding.

const SPINE = [
  { screen: 'fe-origin', slug: 'origin', heading: 'Origin of the import' },
  {
    screen: 'fe-commodity-search',
    slug: 'commodities',
    heading: 'What are you importing?'
  },
  {
    screen: 'fe-consignment-details',
    slug: 'consignment-details',
    heading: 'Consignment details'
  },
  {
    screen: 'fe-animal-identification',
    slug: 'commodities/identification',
    heading: 'Animal identification details'
  },
  {
    screen: 'fe-import-reason',
    slug: 'import-reason',
    heading: 'What is the main reason for importing the animals?'
  },
  {
    screen: 'fe-import-purpose',
    slug: 'import-purpose',
    heading: 'Purpose in the internal market'
  },
  {
    screen: 'fe-additional-details',
    slug: 'additional-details',
    heading: 'Additional animal details'
  },
  {
    screen: 'fe-addresses-hub',
    slug: 'addresses',
    heading: 'Consignment addresses'
  },
  {
    screen: 'fe-cph-number',
    slug: 'cph-number',
    heading: 'County Parish Holding (CPH)'
  },
  {
    screen: 'fe-arrival-details',
    slug: 'port-of-entry',
    heading: 'Arrival details'
  },
  {
    screen: 'fe-transit-countries',
    slug: 'transit-countries',
    heading: 'Which countries will the consignment travel through?'
  },
  {
    screen: 'fe-transporter-type',
    slug: 'transporters',
    heading: 'Transporter'
  },
  {
    screen: 'fe-transporter-commercial',
    slug: 'transporters/select',
    heading: 'Search for an approved commercial transporter'
  },
  {
    screen: 'fe-transporter-private',
    slug: 'transporters/private',
    heading: 'Private transporter details'
  },
  {
    screen: 'fe-contact',
    slug: 'consignment/contact/select',
    heading: 'Contact address for consignment'
  },
  {
    screen: 'fe-documents-empty',
    slug: 'accompanying-documents',
    heading: 'Uploaded documents'
  },
  {
    screen: 'fe-check-answers',
    slug: 'notification-view',
    heading: 'Check your answers'
  },
  { screen: 'fe-declaration', slug: 'declaration', heading: 'Declaration' },
  {
    screen: 'fe-address-picker-place-of-origin',
    slug: 'place-of-origin/select',
    heading: 'Place of origin'
  },
  {
    screen: 'fe-address-picker-consignor-or-exporter',
    slug: 'consignors/select',
    heading: 'Consignor or exporter'
  },
  {
    screen: 'fe-address-picker-consignee',
    slug: 'consignees/select',
    heading: 'Consignee'
  },
  {
    screen: 'fe-address-picker-importer',
    slug: 'importers/select',
    heading: 'Importer'
  },
  {
    screen: 'fe-address-picker-place-of-destination',
    slug: 'destinations/select',
    heading: 'Place of destination'
  },
  {
    screen: 'fe-destination-country',
    slug: 'destination-country',
    heading: 'Destination country'
  },
  { screen: 'fe-port-of-exit', slug: 'port-of-exit', heading: 'Port of exit' },
  { screen: 'fe-exit-date', slug: 'exit-date', heading: 'Exit date' }
]

const rows = []
const gaps = []

/**
 * Go to one screen and photograph it, or record why not.
 *
 * A screen the journey cannot reach in this state is a gap with a reason, not
 * a failure — the report renders it as a stated absence and falls back to the
 * page model.
 */
const capture = async (page, { screen, slug, heading, at }) => {
  await page.goto(at ? at(slug) : journeyUrl(page, slug))
  const landed = page.getByRole('heading', { name: heading, exact: false })
  if ((await landed.count()) === 0) {
    gaps.push({
      screen,
      why: `Expected the heading "${heading}" and landed on ${new URL(page.url()).pathname}. An entry guard sent the journey elsewhere.`
    })
    return
  }
  rows.push(await captureScreen(page, screen))
}

test.describe('evidence capture', () => {
  test('photograph every frontend screen the corpus names', async ({
    page
  }) => {
    test.slow()

    await page.goto('/')
    rows.push(await captureScreen(page, 'fe-dashboard-empty'))

    await startNotification(page)
    rows.push(await captureScreen(page, 'fe-hub'))

    // Held here because journeyUrl reads the id off the current URL, and the
    // last few screens are reached from the dashboard, where there is no id.
    const notification = journeyIdFromPage(page)
    const at = (slug) => `/notifications/${notification}/${slug}`

    await completeAnswerSections(page)

    // A document has to exist before the documents table is worth a picture,
    // and the corpus captured the empty state — so shoot that first.
    await page.goto(journeyUrl(page, 'accompanying-documents'))
    rows.push(await captureScreen(page, 'fe-documents-empty'))
    const [document] = values.documents
    await addDocument(page, document)
    await expect(
      page.locator('.govuk-table__row', {
        hasText: document.accompanyingDocumentReference
      })
    ).toContainText('Safe')
    rows.push(await captureScreen(page, 'fe-documents-populated'))

    for (const target of SPINE) {
      if (target.screen === 'fe-documents-empty') continue
      await capture(page, target)
    }

    // The create-address form is reached from a picker, not from a slug: it
    // needs the picker's return context to know where to send the user back to.
    await page.goto(at('consignors/select'))
    await page.getByRole('button', { name: 'Add a new address' }).click()
    await expect(
      page.getByRole('heading', { name: 'Add a new address' })
    ).toBeVisible()
    rows.push(await captureScreen(page, 'fe-create-address'))

    // The dashboard is only worth a second picture once it has a notification
    // on it — which is the state the corpus captured as fe-dashboard-populated.
    await page.goto('/')
    rows.push(await captureScreen(page, 'fe-dashboard-populated'))

    // Everything below needs a SUBMITTED notification, so it runs last: the
    // journey cannot be walked again afterwards.
    await page.goto(at('notification-view'))
    await page.getByRole('button', { name: 'Continue' }).click()
    await page
      .getByRole('checkbox', { name: /I confirm that I have reviewed/ })
      .check()
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page).toHaveURL(/\/confirmation$/)
    rows.push(await captureScreen(page, 'fe-confirmation'))

    // Delete is reachable from the notification view of a submitted
    // notification, not from the dashboard row.
    await capture(page, {
      screen: 'fe-delete-notification',
      slug: 'delete',
      heading: 'Delete this notification?',
      at
    })

    // Cancel-amend needs an amendment in progress, so start one first.
    await page.goto('/')
    const amend = page.getByRole('link', { name: 'Amend' }).first()
    if ((await amend.count()) === 0) {
      gaps.push({
        screen: 'fe-cancel-amend',
        why: 'No "Amend" action on any dashboard row, so no amendment could be started to cancel.'
      })
    } else {
      await amend.click()
      await capture(page, {
        screen: 'fe-cancel-amend',
        slug: 'cancel-amend',
        heading: 'Cancel this amendment?',
        at
      })
    }

    const manifest = writeManifest(rows)
    console.log(
      `captured ${rows.length} screens -> ${manifest}` +
        (gaps.length
          ? `\nnot reached:\n${gaps.map((gap) => `  ${gap.screen}: ${gap.why}`).join('\n')}`
          : '')
    )

    // The run is worth nothing if it photographed almost nothing, and a silent
    // near-miss is how a report ends up claiming evidence it does not have.
    expect(rows.length).toBeGreaterThan(10)
  })
})
