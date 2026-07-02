import { test, expect } from '@playwright/test'
import * as o from './obligations-journey.js'

/**
 * Rulings item 1 — POST-SUBMIT FREEZE (Outcome A). After 'Quote
 * confirmed' the journey is frozen: the one-way in-progress → submitted
 * flip (with submittedAt) blocks every storage write, and every journey
 * route — hub, task pages, Change links, any POST — resolves to the
 * read-only CYA. Only the read-only CYA GET and the confirmation GET
 * survive. Spike-a's real behaviour is unfrozen; that outcome is
 * intentionally NOT copied here (the shared specs end on the panel and
 * never observe post-submit behaviour either way).
 */

const cyaHeading = (page) =>
  page.getByRole('heading', { name: 'Check your answers' })

/** Read-only CYA: no Change actions, no send form, nothing editable. */
async function expectReadOnlyCya(page) {
  await expect(cyaHeading(page)).toBeVisible()
  await expect(page.getByRole('link', { name: /^Change/ })).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Accept and get quote' })
  ).toHaveCount(0)
  await expect(page.locator('form')).toHaveCount(0)
}

/** The page's CSRF token, needed to replay POSTs through the cookie jar. */
const crumbFrom = (page) =>
  page.locator('meta[name="csrf-token"]').getAttribute('content')

test.describe(o.OBLIGATIONS.label, () => {
  test('hub, task pages and Change links all resolve to read-only CYA after submit', async ({
    page
  }) => {
    await o.submitToQuoteConfirmed(page)

    await page.goto(o.pagePath('hub'))
    await expectReadOnlyCya(page)
    expect(page.url()).toContain('/check-your-answers')

    // A plain question page…
    await page.goto(o.pagePath('about-you'))
    await expectReadOnlyCya(page)

    // …a CYA Change round-trip URL…
    await page.goto(`${o.pagePath('driving-history')}?change=1`)
    await expectReadOnlyCya(page)

    // …and the claims manage list (its own route family) freeze alike.
    await page.goto(o.pagePath('claims'))
    await expectReadOnlyCya(page)
  })

  test('a re-POST after submit alters nothing', async ({ page }) => {
    await o.submitToQuoteConfirmed(page)

    await page.goto(o.pagePath('check-your-answers'))
    // The fullName row's CYA key is 'Name' (spike-a parity — see
    // parity-facts.json cya rows and flow.json cyaKey), so anchor on the
    // exact key: a 'Full name' filter matches nothing here.
    const fullNameRow = page.locator('.govuk-summary-list__row').filter({
      has: page.locator('.govuk-summary-list__key', {
        hasText: /^\s*Name\s*$/
      })
    })
    await expect(fullNameRow).toContainText('Alex Driver')
    const crumb = await crumbFrom(page)

    // Replay a save against a task page through the same cookie jar. The
    // guard resolves it to CYA; the repository write-block keeps the
    // stored answer intact either way.
    const replay = await page.request.post(o.pagePath('about-you'), {
      form: { crumb, fullName: 'Someone Else' }
    })
    expect(replay.ok()).toBe(true)
    expect(replay.url()).toContain('/check-your-answers')

    // A re-POST of CYA itself re-renders read-only — never a second
    // submit, never an error page.
    const resubmit = await page.request.post(o.pagePath('check-your-answers'), {
      form: { crumb }
    })
    expect(resubmit.ok()).toBe(true)

    await page.reload()
    await expect(fullNameRow).toContainText('Alex Driver')
    await expect(fullNameRow).not.toContainText('Someone Else')
  })

  test('confirmation survives read-only with the same deterministic reference', async ({
    page,
    context
  }) => {
    await o.submitToQuoteConfirmed(page)

    // 'CI-' + the journeyId's first 6 hex, uppercased — so a revisit
    // re-renders the identical confirmation, no re-stamping.
    const journeyId = await o.journeyIdFrom(context)
    const reference = `CI-${journeyId.replace(/-/g, '').slice(0, 6).toUpperCase()}`
    await expect(page.locator('.govuk-panel')).toContainText(reference)

    await page.goto(o.pagePath('confirmation'))
    await expect(
      page.getByRole('heading', { name: 'Quote confirmed' })
    ).toBeVisible()
    await expect(page.locator('.govuk-panel')).toContainText(reference)
    // Read-only here too: the confirmation carries no form controls.
    await expect(page.locator('form')).toHaveCount(0)
  })
})
