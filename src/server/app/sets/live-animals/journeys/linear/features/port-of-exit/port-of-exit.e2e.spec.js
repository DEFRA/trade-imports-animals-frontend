import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { portsOfEntry } from '../../../../../../services/_capture/fixtures.js'
import { copy } from './copy/copy.en.js'

const startAtPortOfExit = async (page) => {
  await page.goto('/live-animals')
  await page
    .locator('form[action="/live-animals/notifications"]')
    .getByRole('button')
    .click()
  await page.locator('input[name="importType"][value="live-animals"]').check()
  await page.locator('form').getByRole('button').click()
  await expect(page).toHaveURL((url) =>
    /^\/live-animals\/notifications\/[^/]+\/origin$/.test(url.pathname)
  )

  const reasonUrl = page.url().replace(/\/origin$/, '/import-reason')
  await page.goto(reasonUrl)
  await page
    .locator('input[name="reasonForImport"][value="temporaryAdmissionHorses"]')
    .check()
  await page.locator('form button[type="submit"]').first().click()
  await page.goto(reasonUrl.replace(/\/import-reason$/, '/port-of-exit'))
  await expect(page.getByRole('heading', { name: copy.title })).toBeVisible()
}

test.describe('port-of-exit feature', () => {
  test.beforeEach(async ({ page }) => {
    await startAtPortOfExit(page)
  })

  test('renders the captured port options and feature copy', async ({
    page
  }) => {
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
  })

  test('port validation: when no port is selected, links to and focuses the empty select', async ({
    page
  }) => {
    await page.locator('form button[type="submit"]').first().click()

    const portError = page
      .getByRole('alert')
      .getByRole('link', { name: copy.errors.portRequired })
    await expect(portError).toBeVisible()
    await portError.click()
    await expect(page.getByLabel(copy.port.label)).toBeFocused()
    await expect(page.getByLabel(copy.port.label)).toHaveValue('')
  })

  test('saves a valid port, redirects and persists the answer', async ({
    page
  }) => {
    const portUrl = page.url()
    const selected = portsOfEntry.find(({ code }) => code === 'GB ABD')

    await page.getByLabel(copy.port.label).selectOption(selected.code)
    await page.locator('form button[type="submit"]').first().click()

    await expect(page).toHaveURL((url) =>
      /^\/live-animals\/notifications\/[^/]+$/.test(url.pathname)
    )
    await page.goto(portUrl)
    await expect(page.getByLabel(copy.port.label)).toHaveValue(selected.code)
  })

  test('back link returns to the notification hub', async ({ page }) => {
    const hubUrl = page.url().replace(/\/port-of-exit$/, '')

    await page.getByRole('link', { name: 'Back', exact: true }).click()

    await expect(page).toHaveURL(hubUrl)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
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
