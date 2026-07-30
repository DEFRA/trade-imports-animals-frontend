import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { portsOfEntry } from '../../services/_capture/fixtures.js'
import { copy } from './copy/copy.en.js'

const startAtPortOfExit = async (page) => {
  await page.goto('/')
  await page
    .locator('form[action="/notifications"]')
    .getByRole('button')
    .click()
  await page.locator('input[name="importType"][value="live-animals"]').check()
  await page.locator('form').getByRole('button').click()
  await expect(page).toHaveURL(/\/notifications\/[^/]+\/origin$/)

  const reasonUrl = page.url().replace(/\/origin$/, '/import-reason')
  await page.goto(reasonUrl)
  await page
    .locator('input[name="reasonForImport"][value="temporaryAdmissionHorses"]')
    .check()
  await page.locator('form button[type="submit"]').first().click()
  await page.goto(reasonUrl.replace(/\/import-reason$/, '/port-of-exit'))
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

const saveAndContinue = (page) =>
  page.locator('form button[type="submit"]').first().click()

const errorLink = (page, message) =>
  page.locator('.govuk-error-summary').getByRole('link', { name: message })

test.describe('port-of-exit feature', () => {
  test('renders the captured port options, feature copy and working back link', async ({
    page
  }) => {
    await startAtPortOfExit(page)

    await expect(page.getByLabel(copy.port.label)).toHaveAccessibleDescription(
      copy.port.hint
    )
    const select = page.locator('select#portOfExit')
    await expect(select.locator('option').first()).toHaveText(
      copy.port.placeholder
    )
    const renderedPorts = await select
      .locator('option')
      .evaluateAll((options) =>
        options.slice(2).map((option) => ({
          code: option.value,
          name: option.textContent
        }))
      )
    expect(renderedPorts).toEqual(
      portsOfEntry.map((port) => ({
        code: port.code,
        name: `${port.name} (${port.code})`
      }))
    )

    const hubUrl = page.url().replace(/\/port-of-exit$/, '')
    await page.locator('.govuk-back-link').click()
    await expect(page).toHaveURL(hubUrl)
  })

  test('shows the required validation rule', async ({ page }) => {
    await startAtPortOfExit(page)

    await saveAndContinue(page)

    await expect(errorLink(page, copy.errors.portRequired)).toBeVisible()
    await expect(page.getByLabel(copy.port.label)).toHaveValue('')
  })

  test('saves a valid port, redirects and persists the answer', async ({
    page
  }) => {
    await startAtPortOfExit(page)
    const portUrl = page.url()
    const selected = portsOfEntry.find(({ code }) => code === 'GB ABD')

    await page.getByLabel(copy.port.label).selectOption(selected.code)
    await saveAndContinue(page)

    await expect(page).toHaveURL(/\/notifications\/[^/]+$/)
    await page.goto(portUrl)
    await expect(page.getByLabel(copy.port.label)).toHaveValue(selected.code)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await startAtPortOfExit(page)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    const seriousOrCritical = results.violations.filter(({ impact }) =>
      ['serious', 'critical'].includes(impact)
    )

    expect(
      seriousOrCritical,
      `Port of exit has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
    ).toEqual([])
  })
})
