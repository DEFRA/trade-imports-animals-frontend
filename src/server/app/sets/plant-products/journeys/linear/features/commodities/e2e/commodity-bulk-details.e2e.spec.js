import { expect, test } from '@playwright/test'

import { axeViolations as seriousOrCriticalViolations } from '../../axe.e2e-helper.js'
import { packageTypeOptions } from '../../../../../services/reference/package-types.js'
import { quantityTypeOptions } from '../../../../../services/reference/quantity-types.js'
import { copy as featureCopy } from '../copy/copy.en.js'

const copy = featureCopy.commodityBulkDetails
const basicCopy = featureCopy.basicDescription
const searchCopy = featureCopy.commoditySearch
const summaryCopy = featureCopy.commoditySummary

const commodities = {
  '06042090': { description: 'Other', species: 'Lens culinaris' },
  '06011010': { description: 'Hyacinths', species: 'Albuca bracteata' }
}

const contextFor = (code) => `${code} ${commodities[code].description}`
const bulkUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+\/commodity-bulk-details$/.test(
    url.pathname
  )
const hubUrl = (url) =>
  /^\/plant-products\/notifications\/[^/]+$/.test(url.pathname)

const rowByTitle = (page, title) =>
  page.getByRole('listitem').filter({
    has: page.getByText(title, { exact: true })
  })

const startAtCommoditySearch = async (page) => {
  await page.goto('/plant-products')
  await page.getByRole('button', { name: 'Create a new notification' }).click()
  await page
    .getByRole('radio', { name: 'Plants, plant products and other objects' })
    .check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByLabel('Country of origin').selectOption('FR')
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await page.getByRole('link', { name: 'Back' }).click()
  await rowByTitle(page, 'Commodity')
    .getByRole('link', { name: 'Commodity' })
    .click()
  await page.getByRole('radio', { name: 'Manual entry' }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
}

const speciesTable = (page, code) =>
  page.getByRole('table', {
    name: `${basicCopy.results.caption} ${code}`
  })

const addLine = async (page, code) => {
  await page.getByLabel(searchCopy.codeSearch.label).fill(code)
  await page
    .locator('#commodity-code-search')
    .getByRole('button', { name: searchCopy.codeSearch.button })
    .click()
  const species = commodities[code].species
  await speciesTable(page, code)
    .getByRole('button', {
      name: `${basicCopy.results.addLabel} ${species} ${basicCopy.results.addHidden} ${code}`
    })
    .click()
}

const startAtBulkDetails = async (page, codes = ['06042090']) => {
  await startAtCommoditySearch(page)
  await addLine(page, codes[0])
  await page.getByRole('button', { name: 'Save and continue' }).click()

  for (const code of codes.slice(1)) {
    await page
      .getByRole('button', { name: summaryCopy.addAnotherCommodity })
      .click()
    await addLine(page, code)
    await page.getByRole('button', { name: 'Save and continue' }).click()
  }

  await page.getByRole('button', { name: summaryCopy.continue }).click()
  await expect(page).toHaveURL(bulkUrl)
}

const fieldName = (field, code) => {
  const fieldCopy = copy.fields[field]
  return `${fieldCopy.label ?? fieldCopy.legend} for ${contextFor(code)}`
}

const radioGroup = (page, field, code) =>
  page.getByRole('group', { name: fieldName(field, code) })

const booleanOptionName = (field, value, code) =>
  `${copy.fields[field].options[value ? 'yes' : 'no']} — ${fieldName(field, code)}`

const finishedOrPropagatedOptionName = (value, code) =>
  `${
    copy.fields.finishedOrPropagated.options[
      value === 'FINISHED' ? 'finished' : 'propagated'
    ]
  } for ${contextFor(code)}`

const lineControls = (page, code) => ({
  numberOfPackages: page.getByLabel(fieldName('numberOfPackages', code)),
  packageType: page.getByLabel(fieldName('packageType', code)),
  quantity: page.getByLabel(fieldName('quantity', code)),
  quantityType: page.getByLabel(fieldName('quantityType', code)),
  netWeight: page.getByLabel(fieldName('netWeight', code)),
  controlledAtmosphereContainer: radioGroup(
    page,
    'controlledAtmosphereContainer',
    code
  ),
  finishedOrPropagated: radioGroup(page, 'finishedOrPropagated', code),
  intendedForFinalUsers: radioGroup(page, 'intendedForFinalUsers', code),
  testAndTrial: page.getByLabel(fieldName('testAndTrial', code))
})

const fillLine = async (page, code, values) => {
  const controls = lineControls(page, code)
  await controls.numberOfPackages.fill(values.numberOfPackages)
  await controls.packageType.selectOption(values.packageType)
  await controls.quantity.fill(values.quantity)
  await controls.quantityType.selectOption(values.quantityType)
  await controls.netWeight.fill(values.netWeight)
  if (values.controlledAtmosphereContainer != null) {
    await controls.controlledAtmosphereContainer
      .getByLabel(
        booleanOptionName(
          'controlledAtmosphereContainer',
          values.controlledAtmosphereContainer,
          code
        )
      )
      .check()
  }
  if (values.finishedOrPropagated) {
    await controls.finishedOrPropagated
      .getByLabel(
        finishedOrPropagatedOptionName(values.finishedOrPropagated, code)
      )
      .check()
  }
  if (values.intendedForFinalUsers != null) {
    await controls.intendedForFinalUsers
      .getByLabel(
        booleanOptionName(
          'intendedForFinalUsers',
          values.intendedForFinalUsers,
          code
        )
      )
      .check()
  }
  if (values.testAndTrial) await controls.testAndTrial.check()
}

const expectLine = async (page, code, values) => {
  const controls = lineControls(page, code)
  await expect(controls.numberOfPackages).toHaveValue(values.numberOfPackages)
  await expect(controls.packageType).toHaveValue(values.packageType)
  await expect(controls.quantity).toHaveValue(values.quantity)
  await expect(controls.quantityType).toHaveValue(values.quantityType)
  await expect(controls.netWeight).toHaveValue(values.netWeight)
  await expect(
    controls.controlledAtmosphereContainer.getByLabel(
      booleanOptionName(
        'controlledAtmosphereContainer',
        values.controlledAtmosphereContainer,
        code
      )
    )
  ).toBeChecked()
  if (values.finishedOrPropagated) {
    await expect(
      controls.finishedOrPropagated.getByLabel(
        finishedOrPropagatedOptionName(values.finishedOrPropagated, code)
      )
    ).toBeChecked()
  }
  await expect(
    controls.intendedForFinalUsers.getByLabel(
      booleanOptionName(
        'intendedForFinalUsers',
        values.intendedForFinalUsers,
        code
      )
    )
  ).toBeChecked()
  await expect(controls.testAndTrial).toBeChecked({
    checked: values.testAndTrial
  })
}

const lineZero = {
  numberOfPackages: '11',
  packageType: 'BOX',
  quantity: '21.5',
  quantityType: 'PIECES',
  netWeight: '31.25',
  controlledAtmosphereContainer: false,
  intendedForFinalUsers: true,
  testAndTrial: false
}

const lineOne = {
  numberOfPackages: '22',
  packageType: 'CRATE',
  quantity: '42.125',
  quantityType: 'BULBS',
  netWeight: '62.5',
  controlledAtmosphereContainer: true,
  finishedOrPropagated: 'PROPAGATED',
  intendedForFinalUsers: false,
  testAndTrial: true
}

const validUnflagged = async (page) => fillLine(page, '06042090', lineZero)

const expectNoSeriousOrCriticalViolations = async (page, state) => {
  const { all, seriousOrCritical } = await seriousOrCriticalViolations(page)
  expect(
    seriousOrCritical,
    `Commodity bulk details ${state} has serious/critical accessibility violations.\n${JSON.stringify(all, null, 2)}`
  ).toEqual([])
}

test.describe('plant-products commodity bulk details', () => {
  test('renders one H1, fixture options and distinct real labels for every repeated control', async ({
    page
  }) => {
    await startAtBulkDetails(page, ['06042090', '06011010'])

    await expect(page.getByText(copy.caption, { exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: copy.heading })
    ).toHaveCount(1)
    const first = lineControls(page, '06042090')
    const second = lineControls(page, '06011010')
    await expect(first.packageType.locator('option')).toHaveCount(24)
    await expect(first.quantityType.locator('option')).toHaveCount(8)
    await expect(first.packageType.locator('option').last()).toHaveText(
      packageTypeOptions.at(-1).text
    )
    await expect(first.quantityType.locator('option').last()).toHaveText(
      quantityTypeOptions.at(-1).text
    )
    await expect(first.numberOfPackages).toHaveAccessibleName(
      fieldName('numberOfPackages', '06042090')
    )
    await expect(second.numberOfPackages).toHaveAccessibleName(
      fieldName('numberOfPackages', '06011010')
    )
    const repeatedControlNames = [
      ...['06042090', '06011010'].flatMap((code) => [
        contextFor(code),
        fieldName('numberOfPackages', code),
        fieldName('packageType', code),
        fieldName('quantity', code),
        fieldName('quantityType', code),
        fieldName('netWeight', code),
        booleanOptionName('controlledAtmosphereContainer', true, code),
        booleanOptionName('controlledAtmosphereContainer', false, code),
        booleanOptionName('intendedForFinalUsers', true, code),
        booleanOptionName('intendedForFinalUsers', false, code),
        fieldName('testAndTrial', code)
      ]),
      finishedOrPropagatedOptionName('FINISHED', '06011010'),
      finishedOrPropagatedOptionName('PROPAGATED', '06011010')
    ]
    expect(new Set(repeatedControlNames).size).toBe(repeatedControlNames.length)
    for (const accessibleName of repeatedControlNames) {
      await expect(
        page.getByLabel(accessibleName, { exact: true })
      ).toHaveCount(1)
    }
    await expect(
      page.getByLabel(contextFor('06042090'), { exact: true })
    ).toBeVisible()
    await expect(
      page.getByLabel(contextFor('06011010'), { exact: true })
    ).toBeVisible()
    await expect(page.locator('form [aria-labelledby]')).toHaveCount(0)
    await expect(
      page.locator('form input[aria-label], form select[aria-label]')
    ).toHaveCount(0)
  })

  test('persists every line, then edits non-zero line 1 without changing any line 0 cell', async ({
    page
  }) => {
    await startAtBulkDetails(page, ['06042090', '06011010'])
    const detailsUrl = page.url()
    await fillLine(page, '06042090', lineZero)
    await fillLine(page, '06011010', lineOne)
    await page.getByRole('button', { name: 'Save and continue' }).click()

    await expect(page).toHaveURL(hubUrl)
    await expect(rowByTitle(page, 'Purpose')).toContainText('Not yet started')
    await expect(rowByTitle(page, 'Commodity')).toContainText('Completed')
    await expect(rowByTitle(page, 'Transport to the BCP')).toContainText(
      'Not yet started'
    )
    await page.goto(detailsUrl)
    await expectLine(page, '06042090', lineZero)
    await expectLine(page, '06011010', lineOne)

    const changedLineOne = { ...lineOne, numberOfPackages: '44' }
    await lineControls(page, '06011010').numberOfPackages.fill('44')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page).toHaveURL(hubUrl)
    await page.goto(detailsUrl)
    await expectLine(page, '06042090', lineZero)
    await expectLine(page, '06011010', changedLineOne)
  })

  test('bulk apply changes only selected non-zero line 1, leaves every other cell untouched, and clear is scoped', async ({
    page
  }) => {
    await startAtBulkDetails(page, ['06042090', '06011010'])
    const detailsUrl = page.url()
    await fillLine(page, '06042090', lineZero)
    await fillLine(page, '06011010', lineOne)
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await page.goto(detailsUrl)

    await page.getByLabel(contextFor('06011010'), { exact: true }).check()
    await page
      .getByLabel(copy.fields.numberOfPackages.label, { exact: true })
      .fill('77')
    await page
      .getByLabel(copy.fields.quantity.label, { exact: true })
      .fill('9.125')
    await page.getByRole('button', { name: copy.bulk.apply }).click()

    const appliedLineOne = {
      ...lineOne,
      numberOfPackages: '77',
      quantity: '9.125'
    }
    await expectLine(page, '06042090', lineZero)
    await expectLine(page, '06011010', appliedLineOne)

    const bulkPackages = page.getByLabel(copy.fields.numberOfPackages.label, {
      exact: true
    })
    await bulkPackages.fill('88')
    await page.getByRole('button', { name: copy.bulk.clear }).click()
    await expect(bulkPackages).toHaveValue('')
    await expectLine(page, '06042090', lineZero)
    await expectLine(page, '06011010', appliedLineOne)
  })

  test('bulk apply requires at least one selected commodity line', async ({
    page
  }) => {
    await startAtBulkDetails(page)
    await page
      .getByLabel(copy.fields.numberOfPackages.label, { exact: true })
      .fill('5')
    await page.getByRole('button', { name: copy.bulk.apply }).click()

    const alert = page.getByRole('alert')
    const link = alert.getByRole('link', { name: copy.errors.selectLine })
    await expect(link).toHaveAttribute('href', '#selectedLines')
    await link.click()
    await expect(
      page.getByLabel(copy.bulk.selectAll, { exact: true })
    ).toBeFocused()
  })

  test('bulk apply requires at least one of the six bulk fields', async ({
    page
  }) => {
    await startAtBulkDetails(page)
    await page.getByLabel(contextFor('06042090'), { exact: true }).check()
    await page.getByRole('button', { name: copy.bulk.apply }).click()

    const alert = page.getByRole('alert')
    const link = alert.getByRole('link', { name: copy.errors.fillOneField })
    await expect(link).toHaveAttribute('href', '#bulk-numberOfPackages')
    await link.click()
    await expect(
      page.getByLabel(copy.fields.numberOfPackages.label, { exact: true })
    ).toBeFocused()
  })

  const validationCases = [
    {
      name: 'number of packages required',
      field: 'numberOfPackages',
      value: '',
      error: 'numberOfPackagesRequired'
    },
    {
      name: 'number of packages whole number',
      field: 'numberOfPackages',
      value: '1.5',
      error: 'numberOfPackagesWhole'
    },
    {
      name: 'package type required',
      field: 'packageType',
      value: '',
      error: 'packageTypeRequired'
    },
    {
      name: 'quantity required',
      field: 'quantity',
      value: '',
      error: 'quantityRequired'
    },
    {
      name: 'quantity format',
      field: 'quantity',
      value: '1.2345',
      error: 'quantityFormat'
    },
    {
      name: 'quantity type required',
      field: 'quantityType',
      value: '',
      error: 'quantityTypeRequired'
    },
    {
      name: 'net weight required',
      field: 'netWeight',
      value: '',
      error: 'netWeightRequired'
    },
    {
      name: 'net weight minimum',
      field: 'netWeight',
      value: '0',
      error: 'netWeightMin'
    },
    {
      name: 'net weight decimals',
      field: 'netWeight',
      value: '1.2345',
      error: 'netWeightDecimals'
    },
    {
      name: 'net weight digits',
      field: 'netWeight',
      value: '12345678901234.567',
      error: 'netWeightDigits'
    }
  ]

  for (const validationCase of validationCases) {
    test(`links, focuses and preserves raw ${validationCase.name}`, async ({
      page
    }) => {
      await startAtBulkDetails(page)
      await validUnflagged(page)
      const control = lineControls(page, '06042090')[validationCase.field]
      if (validationCase.field.includes('Type')) {
        await control.selectOption(validationCase.value)
      } else {
        await control.fill(validationCase.value)
      }
      await page.getByRole('button', { name: 'Save and continue' }).click()

      const message = copy.errors[validationCase.error]
      const link = page.getByRole('alert').getByRole('link', { name: message })
      await expect(link).toHaveAttribute('href', `#${validationCase.field}-0`)
      await link.click()
      await expect(control).toBeFocused()
      await expect(control).toHaveValue(validationCase.value)
    })
  }

  test('renders and requires finished or propagated only for the plants-for-planting line', async ({
    page
  }) => {
    await startAtBulkDetails(page, ['06042090', '06011010'])
    await fillLine(page, '06042090', lineZero)
    await fillLine(page, '06011010', {
      ...lineOne,
      finishedOrPropagated: null
    })

    await expect(
      page.getByRole('group', {
        name: fieldName('finishedOrPropagated', '06042090')
      })
    ).toHaveCount(0)
    const flaggedGroup = radioGroup(page, 'finishedOrPropagated', '06011010')
    await expect(
      flaggedGroup.getByLabel(
        finishedOrPropagatedOptionName('FINISHED', '06011010')
      )
    ).toHaveValue('FINISHED')
    await expect(
      flaggedGroup.getByLabel(
        finishedOrPropagatedOptionName('PROPAGATED', '06011010')
      )
    ).toHaveValue('PROPAGATED')
    await page.getByRole('button', { name: 'Save and continue' }).click()

    const link = page.getByRole('alert').getByRole('link', {
      name: copy.errors.finishedOrPropagatedRequired
    })
    await expect(link).toHaveAttribute('href', '#finishedOrPropagated-1')
    await link.click()
    await expect(
      radioGroup(page, 'finishedOrPropagated', '06011010')
        .getByRole('radio')
        .first()
    ).toBeFocused()
  })

  test('initial page has no serious or critical axe violations', async ({
    page
  }) => {
    await startAtBulkDetails(page, ['06042090', '06011010'])
    await expectNoSeriousOrCriticalViolations(page, 'initial state')
  })

  test('validation-error page has no serious or critical axe violations', async ({
    page
  }) => {
    await startAtBulkDetails(page)
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expectNoSeriousOrCriticalViolations(page, 'validation-error state')
  })
})
