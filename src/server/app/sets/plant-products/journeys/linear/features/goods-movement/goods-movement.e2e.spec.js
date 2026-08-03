import { expect, test } from '@playwright/test'

import { axeViolations } from '../axe.e2e-helper.js'
import { copy } from './copy/copy.en.js'

const hubUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+$/.test(url.pathname)
const goodsMovementUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+\/goods-movement-services$/.test(
    url.pathname
  )

const rowByTitle = (page, title) =>
  page.getByRole('listitem').filter({
    has: page.getByText(title, { exact: true })
  })

const startAtGoodsMovement = async (page) => {
  await page.goto('/plant-products')
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await page
    .getByRole('radio', { name: 'Plants, plant products and other objects' })
    .check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Country of origin').selectOption('FR')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: 'Back', exact: true }).click()
  await page.getByRole('link', { name: 'Commodity', exact: true }).click()
  await page.getByRole('radio', { name: 'Manual entry' }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Enter commodity code').fill('06011010')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page
    .getByRole('button', {
      name: 'Add Albuca bracteata to commodity 06011010'
    })
    .click()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL((url) =>
    /^\/plant-products\/notifications\/[^/]+\/commodity-summary$/.test(
      url.pathname
    )
  )

  const notificationUrl = page.url().replace(/\/commodity-summary$/, '')
  await page.goto(notificationUrl)
  const row = rowByTitle(page, 'Goods movement services')
  await expect(row).toContainText('Not yet started')
  await row
    .getByRole('link', { name: 'Goods movement services', exact: true })
    .click()
  await expect(page).toHaveURL(goodsMovementUrl)

  return { notificationUrl, pageUrl: page.url() }
}

const ctcGroup = (page) =>
  page.getByRole('group', { name: copy.ctc.legend, exact: true })
const gvmsGroup = (page) =>
  page.getByRole('group', { name: copy.gvms.legend, exact: true })
const mrnInput = (page) => page.getByLabel(copy.mrn.label, { exact: true })
const submit = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

const fillNo = async (page) => {
  await ctcGroup(page)
    .getByRole('radio', { name: copy.ctc.options.NO, exact: true })
    .check()
  await gvmsGroup(page)
    .getByRole('radio', { name: copy.gvms.options.no, exact: true })
    .check()
}

const fillMrn = async (page, mrn = '24GB123456789AB012') => {
  await ctcGroup(page)
    .getByRole('radio', {
      name: copy.ctc.options.ADD_MRN_NOW,
      exact: true
    })
    .check()
  await mrnInput(page).fill(mrn)
  await gvmsGroup(page)
    .getByRole('radio', { name: copy.gvms.options.yes, exact: true })
    .check()
}

const expectLinkedError = async (page, field, message) => {
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('There is a problem')
  const link = alert.getByRole('link', { name: message, exact: true })
  await expect(link).toHaveAttribute('href', `#${field}`)
  await link.click()
  await expect(page.locator(`#${field}`)).toBeFocused()
}

const expectNoSeriousOrCriticalViolations = async (page, state) => {
  const { all, seriousOrCritical } = await axeViolations(page, {
    ariaControls: 'conditional-commonTransitConvention',
    target: '#commonTransitConvention'
  })

  expect(
    seriousOrCritical,
    `Goods movement ${state} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
  ).toEqual([])
}

test.describe('plant-products goods movement services', () => {
  test.beforeEach(async ({ page }) => {
    await startAtGoodsMovement(page)
  })

  test('renders the traced headings, accessibly named controls, wired hint and outbound links', async ({
    page
  }) => {
    await expect(page.getByText(copy.caption, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: copy.title, exact: true })
    ).toBeVisible()
    await expect(ctcGroup(page)).toHaveAccessibleName(copy.ctc.legend)
    await expect(gvmsGroup(page)).toHaveAccessibleName(copy.gvms.legend)
    await expect(
      ctcGroup(page).locator('input[name="commonTransitConvention"]')
    ).toHaveCount(3)
    expect(
      await ctcGroup(page)
        .locator('input[name="commonTransitConvention"]')
        .evaluateAll((inputs) => inputs.map(({ value }) => value))
    ).toEqual(['ADD_MRN_NOW', 'ADD_MRN_LATER', 'NO'])
    expect(
      await gvmsGroup(page)
        .locator('input[name="usingGvms"]')
        .evaluateAll((inputs) => inputs.map(({ value }) => value))
    ).toEqual(['yes', 'no'])

    const describedBy = await ctcGroup(page).getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`#${describedBy}`)).toHaveText(copy.ctc.hint)
    await expect(mrnInput(page)).toBeHidden()
    await expect(mrnInput(page)).not.toHaveAttribute('maxlength')

    const details = page.locator('details')
    await expect(details).toHaveCount(2)
    await expect(details.nth(0)).not.toHaveAttribute('open')
    await expect(details.nth(1)).not.toHaveAttribute('open')
    await expect(details.nth(0).locator('summary')).toHaveText(
      copy.ctcDetails.summary
    )
    await expect(details.nth(1).locator('summary')).toHaveText(
      copy.gvmsDetails.summary
    )

    const expectedLinks = [
      {
        text: copy.ctcDetails.linkText,
        href: 'https://www.gov.uk/government/collections/using-common-or-union-transit-to-move-goods-into-through-and-out-of-the-uk'
      },
      {
        text: copy.gvmsDetails.links.portsList,
        href: 'https://www.gov.uk/guidance/list-of-ports-using-the-goods-vehicle-movement-service'
      },
      {
        text: copy.gvmsDetails.links.register,
        href: 'https://www.gov.uk/guidance/register-for-the-goods-vehicle-movement-service'
      },
      {
        text: copy.gvmsDetails.links.gmr,
        href: 'https://www.gov.uk/guidance/get-a-goods-movement-reference'
      }
    ]
    for (const { text, href } of expectedLinks) {
      const link = page.locator(`a[href="${href}"]`).filter({ hasText: text })
      await expect(link).toHaveCount(1)
      await expect(link).toHaveAttribute('href', href)
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', 'noopener')
    }

    await expect(
      page.getByRole('button', { name: 'Save and continue', exact: true })
    ).toHaveCount(1)
    await expect(
      page.getByRole('button', { name: 'Save and return to hub', exact: true })
    ).toHaveClass(/govuk-button--secondary/)
    await expect(
      page.getByRole('link', { name: 'Cancel and return to hub', exact: true })
    ).toHaveAttribute('href', /\/plant-products\/notifications\/[^/]+$/)
  })

  test('reveals the MRN input only for Yes – add MRN now', async ({ page }) => {
    await ctcGroup(page)
      .getByRole('radio', {
        name: copy.ctc.options.ADD_MRN_NOW,
        exact: true
      })
      .check()
    await expect(mrnInput(page)).toBeVisible()
    await expect(mrnInput(page)).toHaveAccessibleName(copy.mrn.label)
    const describedBy = await mrnInput(page).getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`#${describedBy}`)).toHaveText(copy.mrn.hint)

    await ctcGroup(page)
      .getByRole('radio', { name: copy.ctc.options.NO, exact: true })
      .check()
    await expect(mrnInput(page)).toBeHidden()
  })

  test('saves No and No, completes the hub row and reloads both answers', async ({
    page
  }) => {
    const pageUrl = page.url()
    await fillNo(page)
    await submit(page)

    await expect(page).toHaveURL(hubUrl)
    await expect(rowByTitle(page, 'Goods movement services')).toContainText(
      'Completed'
    )
    await page.goto(pageUrl)
    await expect(
      ctcGroup(page).getByRole('radio', {
        name: copy.ctc.options.NO,
        exact: true
      })
    ).toBeChecked()
    await expect(
      gvmsGroup(page).getByRole('radio', {
        name: copy.gvms.options.no,
        exact: true
      })
    ).toBeChecked()
  })

  test('saves and reloads ADD_MRN_NOW, the MRN and GVMS Yes', async ({
    page
  }) => {
    const pageUrl = page.url()
    await fillMrn(page)
    await submit(page)

    await expect(page).toHaveURL(hubUrl)
    await page.goto(pageUrl)
    await expect(
      ctcGroup(page).getByRole('radio', {
        name: copy.ctc.options.ADD_MRN_NOW,
        exact: true
      })
    ).toBeChecked()
    await expect(mrnInput(page)).toBeVisible()
    await expect(mrnInput(page)).toHaveValue('24GB123456789AB012')
    await expect(
      gvmsGroup(page).getByRole('radio', {
        name: copy.gvms.options.yes,
        exact: true
      })
    ).toBeChecked()
  })

  test('switching to ADD_MRN_LATER purges a stored MRN', async ({ page }) => {
    const pageUrl = page.url()
    await fillMrn(page)
    await submit(page)
    await page.goto(pageUrl)

    await ctcGroup(page)
      .getByRole('radio', {
        name: copy.ctc.options.ADD_MRN_LATER,
        exact: true
      })
      .check()
    await submit(page)
    await page.goto(pageUrl)

    await expect(mrnInput(page)).toBeHidden()
    await expect(mrnInput(page)).toHaveValue('')
  })

  test('empty submit shows both radio errors and each summary link focuses its first radio', async ({
    page
  }) => {
    await submit(page)

    await expectLinkedError(
      page,
      'commonTransitConvention',
      copy.errors.commonTransitConventionRequired
    )
    await expectLinkedError(page, 'usingGvms', copy.errors.usingGvmsRequired)
    await expect(
      page.locator('input[name="commonTransitConvention"]:checked')
    ).toHaveCount(0)
    await expect(page.locator('input[name="usingGvms"]:checked')).toHaveCount(0)
  })

  test('ADD_MRN_NOW requires an MRN and focuses the revealed input', async ({
    page
  }) => {
    await fillMrn(page, '')
    await submit(page)

    await expectLinkedError(
      page,
      'movementReferenceNumber',
      copy.errors.movementReferenceNumberInvalid
    )
    await expect(mrnInput(page)).toBeVisible()
  })

  test('a 17-character MRN uses the canonical error and preserves every entered value', async ({
    page
  }) => {
    await fillMrn(page, '24GB123456789AB01')
    await submit(page)

    await expectLinkedError(
      page,
      'movementReferenceNumber',
      copy.errors.movementReferenceNumberInvalid
    )
    await expect(mrnInput(page)).toHaveValue('24GB123456789AB01')
    await expect(
      ctcGroup(page).getByRole('radio', {
        name: copy.ctc.options.ADD_MRN_NOW,
        exact: true
      })
    ).toBeChecked()
    await expect(
      gvmsGroup(page).getByRole('radio', {
        name: copy.gvms.options.yes,
        exact: true
      })
    ).toBeChecked()
  })

  test('back link is a real link to the notification hub', async ({ page }) => {
    const back = page.getByRole('link', { name: 'Back', exact: true })
    await expect(back).toHaveAttribute(
      'href',
      /\/plant-products\/notifications\/[^/]+$/
    )
    await expect(page.locator('a[href="#"]')).toHaveCount(0)
    await back.click()
    await expect(page).toHaveURL(hubUrl)
  })

  test('initial state has computed accessible names and no serious or critical axe violations', async ({
    page
  }) => {
    await expect(ctcGroup(page)).toHaveAccessibleName(copy.ctc.legend)
    await expect(gvmsGroup(page)).toHaveAccessibleName(copy.gvms.legend)
    await expectNoSeriousOrCriticalViolations(page, 'initial state')
  })

  test('expanded reveal has computed accessible names and no serious or critical axe violations', async ({
    page
  }) => {
    await ctcGroup(page)
      .getByRole('radio', {
        name: copy.ctc.options.ADD_MRN_NOW,
        exact: true
      })
      .check()
    await expect(ctcGroup(page)).toHaveAccessibleName(copy.ctc.legend)
    await expect(mrnInput(page)).toHaveAccessibleName(copy.mrn.label)
    await expectNoSeriousOrCriticalViolations(page, 'expanded reveal')
  })

  test('validation state has computed accessible names and no serious or critical axe violations', async ({
    page
  }) => {
    await fillMrn(page, '')
    await submit(page)
    await expect(ctcGroup(page)).toHaveAccessibleName(copy.ctc.legend)
    await expect(gvmsGroup(page)).toHaveAccessibleName(copy.gvms.legend)
    await expect(mrnInput(page)).toHaveAccessibleName(copy.mrn.label)
    await expectNoSeriousOrCriticalViolations(page, 'validation state')
  })
})
