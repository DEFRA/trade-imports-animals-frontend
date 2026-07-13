import { test, expect } from '@playwright/test'
import {
  JOURNEYS,
  goToStart,
  resetSession,
  fillCountryOfOrigin,
  fillRegionCodeRequirement,
  fillReasonForImport,
  fillPurposeInInternalMarket,
  fillTransporterType,
  fillCommercialTransporterDetails,
  fillMeansOfTransport,
  fillTransportIdentification,
  fillArrivalDetails,
  fillContainsUnweanedAnimals,
  fillAnimalsCertifiedFor,
  fillTraderAddress,
  fillAccompanyingDocuments,
  addCommodityLine,
  fillCommodityCode,
  fillCommodityType,
  fillSpecies,
  fillNumberOfAnimals
} from './journey.js'

/**
 * Happy-path browser walks for every variant in `JOURNEYS`. Two
 * scenarios per variant — internal-market (fills the accompanying-
 * documents block) and transit (skips it, leaving that subsection
 * tagged Optional under the 5-way status alphabet).
 *
 * The specs are the browser-level analogue of `e2e-walk.test.js`;
 * they demonstrate the journey in a real browser and record a
 * demo video. The `expect` assertions at the terminals are minimal
 * — the vitest suite already exercises every controller — because
 * the Playwright suite's primary purpose is the DEMO, not the
 * assertion depth.
 */

for (const journey of JOURNEYS) {
  test.describe(`walk — ${journey.label}`, () => {
    test.beforeEach(async ({ page }) => {
      await resetSession(page, journey)
    })

    test('internal-market happy path with 1 commodity line, accompanying documents filled', async ({
      page
    }) => {
      await goToStart(page, journey)

      // Section 1 — origin + reason
      await fillCountryOfOrigin(page, { country: 'FR' })
      await fillRegionCodeRequirement(page, { answer: 'no' })
      await fillReasonForImport(page, { reason: 'internal-market' })
      await fillPurposeInInternalMarket(page, { purpose: 'breeding' })

      // Section 2 — transporter + transport
      await fillTransporterType(page, { transporterType: 'commercial' })
      await fillCommercialTransporterDetails(page)
      await fillMeansOfTransport(page)
      await fillTransportIdentification(page)

      // Section 3 — arrival
      await fillArrivalDetails(page)
      await fillContainsUnweanedAnimals(page)
      await fillAnimalsCertifiedFor(page)

      // Section 4 — trader details (5 address blocks)
      await fillTraderAddress(page, 'placeOfOrigin', {
        name: 'Origin Farm Ltd'
      })
      await fillTraderAddress(page, 'consignor', { name: 'Sender Co' })
      await fillTraderAddress(page, 'consignee', { name: 'Receiver Ltd' })
      await fillTraderAddress(page, 'importer', { name: 'Importer Trading' })
      await fillTraderAddress(page, 'placeOfDestination', {
        name: 'Destination Farm'
      })

      // Section 5 — references (contact address; walk skips
      // internal-reference → trader-reference subsection stays Optional)
      await fillTraderAddress(page, 'contactAddress', {
        name: 'Contact Person'
      })

      // Accompanying-documents — user reaches it voluntarily from the
      // hub (branchedGate starts all four fields optional so /start
      // skips the page). This walk fills it to exercise the branched
      // "all mandatory once any is filled" gate.
      await page.goto(`${journey.base}/pages/accompanying-documents`)
      await fillAccompanyingDocuments(page)

      // Section 6 — commodity lines
      await addCommodityLine(page, journey)
      await fillCommodityCode(page)
      await fillCommodityType(page)
      await fillSpecies(page)
      await fillNumberOfAnimals(page)

      // Terminal — task list should show 13 Completed + 1 Optional
      // (trader-reference, unfilled).
      await page.goto(`${journey.base}/task-list`)
      const completedCount = await page.getByText('Completed').count()
      const optionalCount = await page.getByText('Optional').count()
      expect(
        completedCount,
        `expected 13 Completed tags on the task list, got ${completedCount}`
      ).toBe(13)
      expect(
        optionalCount,
        `expected 1 Optional tag on the task list, got ${optionalCount}`
      ).toBe(1)
      await expect(page.getByText('Not started')).toHaveCount(0)
      await expect(page.getByText('In progress')).toHaveCount(0)

      // CYA renders with representative filled rows visible.
      await page
        .getByRole('link', { name: 'Check your answers so far' })
        .click()
      await expect(
        page.getByRole('heading', { name: 'Check your answers' })
      ).toBeVisible()
      await expect(page.getByText('France')).toBeVisible()
      await expect(page.getByText('Cattle (0102)')).toBeVisible()
    })

    test('transit happy path skipping accompanying documents surfaces two Optional tags', async ({
      page
    }) => {
      await goToStart(page, journey)

      await fillCountryOfOrigin(page, { country: 'FR' })
      await fillRegionCodeRequirement(page, { answer: 'no' })
      await fillReasonForImport(page, { reason: 'transit' })
      // NB: no purpose-details step — purposeInInternalMarket is NA
      // on transit, so /start skips it.

      await fillTransporterType(page, { transporterType: 'commercial' })
      await fillCommercialTransporterDetails(page)
      await fillMeansOfTransport(page)
      await fillTransportIdentification(page)

      await fillArrivalDetails(page)
      await fillContainsUnweanedAnimals(page)
      await fillAnimalsCertifiedFor(page)

      await fillTraderAddress(page, 'placeOfOrigin', {
        name: 'Origin Farm Ltd'
      })
      await fillTraderAddress(page, 'consignor', { name: 'Sender Co' })
      await fillTraderAddress(page, 'consignee', { name: 'Receiver Ltd' })
      await fillTraderAddress(page, 'importer', { name: 'Importer Trading' })
      await fillTraderAddress(page, 'placeOfDestination', {
        name: 'Destination Farm'
      })

      await fillTraderAddress(page, 'contactAddress', {
        name: 'Contact Person'
      })
      // internal-reference AND accompanying-documents both skipped —
      // both subsections stay Optional under the 5-way alphabet.

      await addCommodityLine(page, journey)
      await fillCommodityCode(page)
      await fillCommodityType(page)
      await fillSpecies(page)
      await fillNumberOfAnimals(page)

      // Terminal — 12 Completed + 2 Optional. Matches the vitest
      // e2e-walk.test.js "transit-through-EU" case.
      await page.goto(`${journey.base}/task-list`)
      const completedCount = await page.getByText('Completed').count()
      const optionalCount = await page.getByText('Optional').count()
      expect(
        completedCount,
        `expected 12 Completed tags on the task list, got ${completedCount}`
      ).toBe(12)
      expect(
        optionalCount,
        `expected 2 Optional tags on the task list, got ${optionalCount}`
      ).toBe(2)
      await expect(page.getByText('Not started')).toHaveCount(0)
      await expect(page.getByText('In progress')).toHaveCount(0)

      // Optional tags render with the govuk-tag--turquoise class (the
      // colour we chose to distinguish "opt-in room" from Not started
      // and In progress). Assert against one instance.
      const firstOptional = page.getByText('Optional').first()
      await expect(firstOptional).toHaveClass(/govuk-tag--turquoise/)
    })
  })
}
