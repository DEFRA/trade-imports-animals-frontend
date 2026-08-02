import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { list as listBcps } from '../../../../services/reference/bcps.js'
import { meansOfTransportOptions } from '../../../../services/reference/transport-options.js'
import { copy } from './copy/copy.en.js'

const startAtTransport = async (page) => {
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
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expect(page).toHaveURL((url) =>
    /^\/plant-products\/notifications\/[^/]+$/.test(url.pathname)
  )
  await page
    .getByRole('link', { name: 'Transport to the BCP', exact: true })
    .click()
  await expect(page).toHaveURL((url) =>
    /^\/plant-products\/notifications\/[^/]+\/transport-before-bip$/.test(
      url.pathname
    )
  )
}

const dateAt = (offset = 1) => {
  const now = new Date()
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset)
  )
  return {
    day: String(date.getUTCDate()),
    month: String(date.getUTCMonth() + 1),
    year: String(date.getUTCFullYear())
  }
}

const fillDate = async (page, offset = 1) => {
  const date = dateAt(offset)
  await page.getByLabel(copy.arrivalDate.day, { exact: true }).fill(date.day)
  await page
    .getByLabel(copy.arrivalDate.month, { exact: true })
    .fill(date.month)
  await page.getByLabel(copy.arrivalDate.year, { exact: true }).fill(date.year)
}

const fillValid = async (
  page,
  { bcp = 'GBLHR4PP', premises, usesContainers = false } = {}
) => {
  await page.getByLabel(copy.bcp.label).selectOption(bcp)
  if (premises) {
    await page.getByLabel(copy.premises.label).selectOption(premises)
  }
  await page
    .getByLabel(copy.means.label, { exact: true })
    .selectOption('ROAD_VEHICLE')
  await page.getByLabel(copy.identification.label).fill('AB12 CDE')
  await page.getByLabel(copy.documentReference.label).fill('CMR-123')
  await fillDate(page)
  await page.getByLabel(copy.arrivalTime.hour, { exact: true }).fill('14')
  await page.getByLabel(copy.arrivalTime.minute, { exact: true }).fill('50')
  if (usesContainers !== null) {
    await page
      .getByRole('radio', {
        name: usesContainers ? copy.usesContainers.yes : copy.usesContainers.no,
        exact: true
      })
      .check()
  }
}

const submit = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

const expectErrorFocus = async (page, message, id) => {
  const alert = page.getByRole('alert')
  await expect(alert).toContainText('There is a problem')
  const link = alert.getByRole('link', { name: message, exact: true })
  await expect(link).toHaveAttribute('href', `#${id}`)
  await link.click()
  await expect(page.locator(`#${id}`)).toBeFocused()
}

const seriousOrCriticalViolations = async (page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  return {
    all: results.violations,
    seriousOrCritical: results.violations.filter(({ id, impact, nodes }) => {
      // GOV.UK Frontend's stock conditional-radio script adds aria-expanded
      // to the controlling radio. axe 4.12 rejects that exact generated node.
      const stockConditionalRadioFalsePositive =
        id === 'aria-allowed-attr' &&
        nodes.every(
          ({ html, target }) =>
            html.includes('class="govuk-radios__input"') &&
            html.includes('aria-controls="conditional-usesContainers"') &&
            target.length === 1 &&
            target[0] === '#usesContainers'
        )
      return (
        ['serious', 'critical'].includes(impact) &&
        !stockConditionalRadioFalsePositive
      )
    })
  }
}

test.describe('plant-products transport before BCP', () => {
  test.beforeEach(async ({ page }) => {
    await startAtTransport(page)
  })

  test('renders fixture-backed controls with correct names, unanswered radios and associated hints', async ({
    page
  }) => {
    await expect(page.getByText(copy.caption, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: copy.heading })
    ).toBeVisible()

    const bcp = page.getByLabel(copy.bcp.label)
    await expect(bcp).toHaveAccessibleName(copy.bcp.label)
    await expect(bcp.locator('option')).toHaveCount(listBcps().length + 1)
    await expect(bcp.locator('option').nth(1)).toHaveText(listBcps()[0].text)

    const means = page.getByLabel(copy.means.label, { exact: true })
    await expect(means).toHaveAccessibleName(copy.means.label)
    await expect(means.locator('option')).toHaveCount(
      meansOfTransportOptions.length + 1
    )
    await expect(means.locator('option').first()).toHaveText(
      copy.means.placeholder
    )

    await expect(
      page.locator('input[name="usesContainers"]:checked')
    ).toHaveCount(0)
    await expect(
      page.getByLabel(copy.identification.label)
    ).toHaveAccessibleDescription(copy.identification.hint)
    await expect(
      page.getByLabel(copy.documentReference.label)
    ).toHaveAccessibleDescription(copy.documentReference.hint)

    const dateGroup = page.getByRole('group', {
      name: copy.arrivalDate.legend
    })
    await expect(dateGroup).toHaveAccessibleDescription(copy.arrivalDate.hint)
    await expect(dateGroup.locator('input')).toHaveCount(3)

    const timeGroup = page.getByRole('group', {
      name: copy.arrivalTime.legend
    })
    await expect(timeGroup).toHaveAccessibleDescription(copy.arrivalTime.hint)
    await expect(timeGroup.locator('.govuk-input--width-2')).toHaveCount(2)
  })

  test('saves the No path, completes the hub row and persists every field', async ({
    page
  }) => {
    const transportUrl = page.url()
    await fillValid(page)
    await submit(page)

    await expect(page).toHaveURL((url) =>
      /^\/plant-products\/notifications\/[^/]+$/.test(url.pathname)
    )
    const row = page.getByRole('listitem').filter({
      has: page.getByText('Transport to the BCP', { exact: true })
    })
    await expect(row).toContainText('Completed')

    await page.goto(transportUrl)
    await expect(page.getByLabel(copy.bcp.label)).toHaveValue('GBLHR4PP')
    await expect(
      page.getByLabel(copy.means.label, { exact: true })
    ).toHaveValue('ROAD_VEHICLE')
    await expect(page.getByLabel(copy.identification.label)).toHaveValue(
      'AB12 CDE'
    )
    await expect(page.getByLabel(copy.documentReference.label)).toHaveValue(
      'CMR-123'
    )
    await expect(
      page.getByRole('radio', { name: copy.usesContainers.no, exact: true })
    ).toBeChecked()
    await expect(
      page.getByLabel(copy.arrivalTime.hour, { exact: true })
    ).toHaveValue('14')
    await expect(
      page.getByLabel(copy.arrivalTime.minute, { exact: true })
    ).toHaveValue('50')
  })

  test('filters premises by POSTed BCP and wipes a stale answer after the BCP changes', async ({
    page
  }) => {
    await page.getByLabel(copy.bcp.label).selectOption('CONPNT')
    await submit(page)

    const premises = page.getByLabel(copy.premises.label)
    await expect(premises.locator('option')).toHaveCount(3)
    await expect(premises.locator('option').nth(1)).toHaveText(
      'Barfoots of Botley (Chichester)'
    )
    await fillValid(page, { bcp: 'CONPNT', premises: 'INSPBAR1' })
    await submit(page)
    await page
      .getByRole('link', { name: 'Transport to the BCP', exact: true })
      .click()
    await expect(page.getByLabel(copy.premises.label)).toHaveValue('INSPBAR1')

    await page.getByLabel(copy.premises.label).selectOption('')
    await page.getByLabel(copy.bcp.label).selectOption('GBLHR4PP')
    await submit(page)
    await page
      .getByRole('link', { name: 'Transport to the BCP', exact: true })
      .click()
    await expect(page.getByLabel(copy.premises.label)).toHaveCount(0)
  })

  test('adds and removes rows, exposes the official-seal label and purges rows on No', async ({
    page
  }) => {
    await fillValid(page, { usesContainers: true })
    const officialSeal = page.getByLabel(copy.containers.officialSeal.label, {
      exact: true
    })
    await expect(officialSeal).toHaveAccessibleName(
      copy.containers.officialSeal.label
    )
    await expect(officialSeal).toHaveAccessibleDescription(
      copy.containers.officialSeal.hint
    )

    await page.getByLabel(copy.containers.containerNumber.label).fill('CONT-1')
    await page.getByLabel(copy.containers.sealNumber.label).fill('SEAL-1')
    await officialSeal.check()
    await page.getByRole('button', { name: copy.containers.add }).click()
    await expect(page.getByRole('table')).toContainText('CONT-1')
    await expect(page.getByRole('table')).toContainText('SEAL-1')

    await page.getByLabel(copy.containers.containerNumber.label).fill('CONT-2')
    await page.getByRole('button', { name: copy.containers.add }).click()
    await expect(page.getByRole('table')).toContainText('CONT-2')
    await page
      .getByRole('row', { name: /CONT-1 SEAL-1 Yes Remove/ })
      .getByRole('button', { name: copy.containers.remove })
      .click()
    await expect(page.getByRole('table')).not.toContainText('CONT-1')
    await expect(page.getByRole('table')).toContainText('CONT-2')

    await page
      .getByRole('radio', { name: copy.usesContainers.no, exact: true })
      .check()
    await submit(page)
    await page
      .getByRole('link', { name: 'Transport to the BCP', exact: true })
      .click()
    await expect(
      page.getByRole('radio', { name: copy.usesContainers.no, exact: true })
    ).toBeChecked()
    await expect(page.getByRole('table')).toHaveCount(0)
    await expect(page.getByText('CONT-2', { exact: true })).toHaveCount(0)
  })

  test('rejects an empty container row and focuses the container-number input', async ({
    page
  }) => {
    await fillValid(page, { usesContainers: true })
    await page.getByRole('button', { name: copy.containers.add }).click()

    await expectErrorFocus(
      page,
      copy.errors.containerOrSealRequired,
      'containerNumber'
    )
  })

  for (const [name, label, value, message, id] of [
    [
      'container number over 32 characters',
      copy.containers.containerNumber.label,
      'C'.repeat(33),
      copy.errors.containerNumberMaxLength,
      'containerNumber'
    ],
    [
      'seal number over 100 characters',
      copy.containers.sealNumber.label,
      'S'.repeat(101),
      copy.errors.sealNumberMaxLength,
      'sealNumber'
    ]
  ]) {
    test(`rejects a ${name}`, async ({ page }) => {
      await fillValid(page, { usesContainers: true })
      await page.getByLabel(label).fill(value)
      await page.getByRole('button', { name: copy.containers.add }).click()

      await expectErrorFocus(page, message, id)
      await expect(page.locator(`#${id}`)).toHaveValue(value)
    })
  }

  for (const [name, mutate, message, id] of [
    [
      'missing BCP',
      async (page) => page.getByLabel(copy.bcp.label).selectOption(''),
      copy.errors.bcpRequired,
      'borderControlPost'
    ],
    [
      'missing means',
      async (page) =>
        page.getByLabel(copy.means.label, { exact: true }).selectOption(''),
      copy.errors.meansRequired,
      'meansOfTransport'
    ],
    [
      'missing identification',
      async (page) => page.getByLabel(copy.identification.label).fill(''),
      copy.errors.identificationRequired,
      'transportIdentification'
    ],
    [
      'identification over 50 characters',
      async (page) =>
        page.getByLabel(copy.identification.label).fill('I'.repeat(51)),
      copy.errors.identificationMaxLength,
      'transportIdentification'
    ],
    [
      'missing document reference',
      async (page) => page.getByLabel(copy.documentReference.label).fill(''),
      copy.errors.documentReferenceRequired,
      'transportDocumentReference'
    ],
    [
      'document reference over 32 characters',
      async (page) =>
        page.getByLabel(copy.documentReference.label).fill('D'.repeat(33)),
      copy.errors.documentReferenceMaxLength,
      'transportDocumentReference'
    ],
    [
      'missing date',
      async (page) => {
        await page.getByLabel(copy.arrivalDate.day, { exact: true }).fill('')
        await page.getByLabel(copy.arrivalDate.month, { exact: true }).fill('')
        await page.getByLabel(copy.arrivalDate.year, { exact: true }).fill('')
      },
      copy.errors.arrivalDateRequired,
      'arrivalDate-day'
    ],
    [
      'unreal date',
      async (page) => {
        await page.getByLabel(copy.arrivalDate.day, { exact: true }).fill('31')
        await page.getByLabel(copy.arrivalDate.month, { exact: true }).fill('2')
        await page
          .getByLabel(copy.arrivalDate.year, { exact: true })
          .fill('2026')
      },
      copy.errors.arrivalDateReal,
      'arrivalDate-day'
    ],
    [
      'missing time',
      async (page) => {
        await page.getByLabel(copy.arrivalTime.hour, { exact: true }).fill('')
        await page.getByLabel(copy.arrivalTime.minute, { exact: true }).fill('')
      },
      copy.errors.arrivalTimeRequired,
      'arrivalTime-hour'
    ],
    [
      'invalid time',
      async (page) => {
        await page.getByLabel(copy.arrivalTime.hour, { exact: true }).fill('24')
        await page
          .getByLabel(copy.arrivalTime.minute, { exact: true })
          .fill('60')
      },
      copy.errors.arrivalTimeInvalid,
      'arrivalTime-hour'
    ]
  ]) {
    test(`rejects ${name} and focuses its control`, async ({ page }) => {
      await fillValid(page)
      await mutate(page)
      await submit(page)

      await expectErrorFocus(page, message, id)
    })
  }

  test('requires premises for a BCP that offers them', async ({ page }) => {
    await page.getByLabel(copy.bcp.label).selectOption('CONPNT')
    await submit(page)
    await fillValid(page, { bcp: 'CONPNT' })
    await submit(page)

    await expectErrorFocus(
      page,
      copy.errors.premisesRequired,
      'inspectionPremises'
    )
  })

  test('requires an explicit usesContainers answer', async ({ page }) => {
    await fillValid(page, { usesContainers: null })
    await submit(page)

    await expectErrorFocus(
      page,
      copy.errors.usesContainersRequired,
      'usesContainers'
    )
    await expect(
      page.locator('input[name="usesContainers"]:checked')
    ).toHaveCount(0)
  })

  for (const [name, offset] of [
    ['yesterday', -1],
    ['today plus 91 days', 91]
  ]) {
    test(`rejects ${name} at the arrival-date window edge`, async ({
      page
    }) => {
      await fillValid(page)
      const date = dateAt(offset)
      await page
        .getByLabel(copy.arrivalDate.day, { exact: true })
        .fill(date.day)
      await page
        .getByLabel(copy.arrivalDate.month, { exact: true })
        .fill(date.month)
      await page
        .getByLabel(copy.arrivalDate.year, { exact: true })
        .fill(date.year)
      await submit(page)

      await expectErrorFocus(
        page,
        copy.errors.arrivalDateWindow,
        'arrivalDate-day'
      )
    })
  }

  for (const [name, offset] of [
    ['today', 0],
    ['today plus 90 days', 90]
  ]) {
    test(`accepts ${name} at the arrival-date window edge`, async ({
      page
    }) => {
      await fillValid(page)
      const date = dateAt(offset)
      await page
        .getByLabel(copy.arrivalDate.day, { exact: true })
        .fill(date.day)
      await page
        .getByLabel(copy.arrivalDate.month, { exact: true })
        .fill(date.month)
      await page
        .getByLabel(copy.arrivalDate.year, { exact: true })
        .fill(date.year)
      await submit(page)

      await expect(page).toHaveURL((url) =>
        /^\/plant-products\/notifications\/[^/]+$/.test(url.pathname)
      )
    })
  }

  test('back link returns to the hub through a real prefixed href', async ({
    page
  }) => {
    const hubUrl = page.url().replace('/transport-before-bip', '')
    const back = page.getByRole('link', { name: 'Back', exact: true })
    await expect(back).toHaveAttribute('href', new URL(hubUrl).pathname)
    await back.click()
    await expect(page).toHaveURL(hubUrl)
  })

  test('initial page has no serious or critical axe violations', async ({
    page
  }) => {
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)
    expect(
      seriousOrCritical,
      `Transport initial state has serious/critical accessibility violations.\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })

  test('error state with the containers reveal open has no serious or critical axe violations', async ({
    page
  }) => {
    await page
      .getByRole('radio', { name: copy.usesContainers.yes, exact: true })
      .check()
    await page.getByRole('button', { name: copy.containers.add }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)
    expect(
      seriousOrCritical,
      `Transport error/reveal state has serious/critical accessibility violations.\n${JSON.stringify(all, null, 2)}`
    ).toEqual([])
  })
})
