import { test, expect } from '@playwright/test'
import {
  JOURNEYS,
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
 * Each fill helper navigates to its own page URL rather than chaining
 * off the previous submit's redirect. The reason: `nextAfter` returns
 * the user to the task list once a subsection is done, so chaining
 * would land on the task list between subsections. Explicit navigation
 * keeps the shape linear and matches the URL-per-fill idiom that
 * makes the trace viewer easy to reason about.
 */

for (const journey of JOURNEYS) {
  test.describe(`walk — ${journey.label}`, () => {
    test.beforeEach(async ({ page }) => {
      await resetSession(page, journey)
    })

    test('internal-market happy path with 1 commodity line, accompanying documents filled', async ({
      page
    }) => {
      // Section 1 — origin + reason
      await fillCountryOfOrigin(page, journey, { country: 'FR' })
      await fillRegionCodeRequirement(page, journey, { answer: 'no' })
      await fillReasonForImport(page, journey, { reason: 'internal-market' })
      await fillPurposeInInternalMarket(page, journey, { purpose: 'breeding' })

      // Section 2 — transporter + transport
      await fillTransporterType(page, journey, {
        transporterType: 'commercial'
      })
      await fillCommercialTransporterDetails(page, journey)
      await fillMeansOfTransport(page, journey)
      await fillTransportIdentification(page, journey)

      // Section 3 — arrival
      await fillArrivalDetails(page, journey)
      await fillContainsUnweanedAnimals(page, journey)
      await fillAnimalsCertifiedFor(page, journey)

      // Section 4 — trader details (5 address blocks)
      await fillTraderAddress(page, journey, 'placeOfOrigin', {
        name: 'Origin Farm Ltd'
      })
      await fillTraderAddress(page, journey, 'consignor', { name: 'Sender Co' })
      await fillTraderAddress(page, journey, 'consignee', {
        name: 'Receiver Ltd'
      })
      await fillTraderAddress(page, journey, 'importer', {
        name: 'Importer Trading'
      })
      await fillTraderAddress(page, journey, 'placeOfDestination', {
        name: 'Destination Farm'
      })

      // Section 5 — references (contact address; walk skips
      // internal-reference → trader-reference subsection stays Optional)
      await fillTraderAddress(page, journey, 'contactAddress', {
        name: 'Contact Person'
      })

      // Accompanying-documents — exercises the branchedGate
      // "all-mandatory once any is filled" branch.
      await fillAccompanyingDocuments(page, journey)

      // Section 6 — commodity lines
      await addCommodityLine(page, journey)
      await fillCommodityCode(page, journey)
      await fillCommodityType(page, journey)
      await fillSpecies(page, journey)
      await fillNumberOfAnimals(page, journey)

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
      await fillCountryOfOrigin(page, journey, { country: 'FR' })
      await fillRegionCodeRequirement(page, journey, { answer: 'no' })
      await fillReasonForImport(page, journey, { reason: 'transit' })
      // NB: no purpose-details step — purposeInInternalMarket is NA
      // on transit, so /start would skip it. The trader still needs to
      // walk the remaining sections.

      await fillTransporterType(page, journey, {
        transporterType: 'commercial'
      })
      await fillCommercialTransporterDetails(page, journey)
      await fillMeansOfTransport(page, journey)
      await fillTransportIdentification(page, journey)

      await fillArrivalDetails(page, journey)
      await fillContainsUnweanedAnimals(page, journey)
      await fillAnimalsCertifiedFor(page, journey)

      await fillTraderAddress(page, journey, 'placeOfOrigin', {
        name: 'Origin Farm Ltd'
      })
      await fillTraderAddress(page, journey, 'consignor', { name: 'Sender Co' })
      await fillTraderAddress(page, journey, 'consignee', {
        name: 'Receiver Ltd'
      })
      await fillTraderAddress(page, journey, 'importer', {
        name: 'Importer Trading'
      })
      await fillTraderAddress(page, journey, 'placeOfDestination', {
        name: 'Destination Farm'
      })

      await fillTraderAddress(page, journey, 'contactAddress', {
        name: 'Contact Person'
      })
      // internal-reference AND accompanying-documents both skipped —
      // both subsections stay Optional under the 5-way alphabet.

      await addCommodityLine(page, journey)
      await fillCommodityCode(page, journey)
      await fillCommodityType(page, journey)
      await fillSpecies(page, journey)
      await fillNumberOfAnimals(page, journey)

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
