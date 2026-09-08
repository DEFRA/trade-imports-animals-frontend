import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import {
  signIn,
  startNotification,
  unlockSections
} from '../../../../../../../../../../fit/live-animals-journey.js'
import { copy } from '../copy/copy.en.js'

const guidance = copy.guidance
const additional = guidance.additional

const openDocuments = async (page) => {
  await startNotification(page)
  await unlockSections(page)
  await page.getByRole('link', { name: 'Uploaded documents' }).click()
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

const openExpander = async (page) => {
  await page.getByText(additional.summary).click()
  await expect(
    page.getByRole('table', { name: additional.caption })
  ).toBeVisible()
}

test.describe('document upload guidance', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
    await openDocuments(page)
  })

  test('tells the trader what to attach, above the form', async ({ page }) => {
    await expect(page.getByText(guidance.intro)).toBeVisible()
    await expect(page.getByText(guidance.otherDocumentsLead)).toBeVisible()
    for (const document of guidance.otherDocuments) {
      await expect(page.getByText(document, { exact: true })).toBeVisible()
    }
    // The guidance introduces the form, so it must sit outside it.
    await expect(page.locator('form').getByText(guidance.intro)).toHaveCount(0)
    // ...and before it: the trader reads what to attach without scrolling past
    // the upload panel (design release 1).
    await expect(
      page
        .locator('p.govuk-body', { hasText: guidance.intro })
        .locator('xpath=following::form[@data-max-file-size]')
    ).toHaveCount(1)
  })

  test('keeps the additional-documents table behind a closed expander', async ({
    page
  }) => {
    // A closed <details> maps to a group with no accessible name, so match on
    // the summary text it discloses.
    await expect(
      page.getByRole('group').filter({ hasText: additional.summary })
    ).toBeVisible()
    await expect(
      page.getByRole('table', { name: additional.caption })
    ).toBeHidden()

    await openExpander(page)

    const table = page.getByRole('table', { name: additional.caption })
    await expect(
      table.getByRole('columnheader', { name: additional.consignment })
    ).toBeVisible()
    await expect(
      table.getByRole('columnheader', { name: additional.documentsNeeded })
    ).toBeVisible()
    for (const row of additional.rows) {
      await expect(
        table.getByRole('row').filter({ hasText: row.consignment })
      ).toContainText(row.documents)
    }
  })

  test('links out to the GOV.UK guidance in a new tab', async ({ page }) => {
    await openExpander(page)
    const link = page.getByRole('link', { name: additional.linkText })
    await expect(link).toHaveAttribute('href', additional.linkHref)
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noreferrer noopener')
  })

  test('expanded guidance has no serious or critical axe violations', async ({
    page
  }) => {
    await openExpander(page)
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )
    expect(
      seriousOrCritical,
      `Expanded document guidance has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})
