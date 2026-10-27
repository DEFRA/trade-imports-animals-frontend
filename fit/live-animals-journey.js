import { readFileSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import {
  addUtcMonths,
  formatDateText
} from '../src/server/app/lib/validate/calendar.js'
import { COUNTRY_LABELS } from '../src/server/app/services/countries/stub.js'
import { STUB_BOOK } from '../src/server/app/services/address-book/stub/index.js'
import { PORTS } from '../src/server/app/services/ports/stub.js'
import { copy as sharedAppCopy } from '../src/server/app/shared/copy.en.js'
import {
  BISON_BISON_ROW,
  BOS_TAURUS_ROW,
  CANIS_FAMILIARIS_ROW,
  EQUUS_CABALUS_ROW,
  FELIS_CATUS_ROW,
  STRUTHIO_ROW
} from '../src/server/app/sets/live-animals/journeys/linear/features/commodities/search/test-support.js'
import { SET_BASE } from '../src/server/app/sets/live-animals/set.js'
import { copy as commoditiesCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/commodities/copy/copy.en.js'
import { copy as documentsCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/documents/copy/copy.en.js'
import { copy as hubCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/hub/copy/copy.en.js'
import { copy as importReasonCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/import-reason/copy/copy.en.js'
import { copy as originCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/origin/copy/copy.en.js'
import { copy as transportCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/transport/copy/copy.en.js'

export { signIn } from './sign-in.js'

export const BASE = SET_BASE

export const BISON_BISON = BISON_BISON_ROW
export const BOS_TAURUS = BOS_TAURUS_ROW
export const CANIS_FAMILIARIS = CANIS_FAMILIARIS_ROW
export const EQUUS_CABALUS = EQUUS_CABALUS_ROW
export const FELIS_CATUS = FELIS_CATUS_ROW
export const STRUTHIO = STRUTHIO_ROW

const isGovukConditionalRevealFalsePositive = (violation) =>
  violation.id === 'aria-allowed-attr' &&
  violation.nodes.every((node) =>
    /govuk-(radios|checkboxes)__input/.test(node.html)
  )

/**
 * Fails when the page has a serious or critical accessibility violation.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} subject - names the page in the failure message.
 */
export const expectNoSeriousOrCriticalViolations = async (page, subject) => {
  const jsonIndent = 2
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const blocking = results.violations
    .filter(({ impact }) => ['serious', 'critical'].includes(impact))
    .filter((violation) => !isGovukConditionalRevealFalsePositive(violation))

  expect(
    blocking,
    `${subject} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, jsonIndent)}`
  ).toEqual([])
}

/**
 * Fails when the element's content is wider than the element.
 *
 * @param {import('@playwright/test').Locator} element
 * @param {string} subject - names the element in the failure message.
 */
export const expectNoHorizontalOverflow = async (element, subject) => {
  const { overflowsBy, offenders } = await element.evaluate((el) => {
    const rightEdge = el.getBoundingClientRect().left + el.clientWidth
    const textSnippetOf = (descendant) =>
      (descendant.textContent ?? '').trim().slice(0, 30)
    return {
      overflowsBy: el.scrollWidth - el.clientWidth,
      offenders: [...el.querySelectorAll('*')]
        .filter(
          (descendant) => descendant.getBoundingClientRect().right > rightEdge
        )
        .slice(0, 10)
        .map(
          (descendant) =>
            `${descendant.tagName.toLowerCase()}.${descendant.className || '(no class)'} "${textSnippetOf(descendant)}"`
        )
    }
  })
  const viewportWidth = element.page().viewportSize().width

  expect(
    overflowsBy,
    `${subject} overflows horizontally at ${viewportWidth}px: ${offenders.join(', ')}`
  ).toBeLessThanOrEqual(0)
}

export const FORM_GROUP_ANCESTOR_XPATH =
  'xpath=ancestor::*[contains(@class,"govuk-form-group")][1]'

export const expectStyle = async (element, styles) => {
  for (const [property, value] of Object.entries(styles)) {
    await expect(element).toHaveCSS(property, value)
  }
}

export const PHONE_VIEWPORT = { width: 360, height: 740 }
export const DESKTOP_VIEWPORT = { width: 1280, height: 720 }

const documentTop = (locator) =>
  locator.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)

const documentBottom = (locator) =>
  locator.evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY)

/**
 * An anchored matcher for a URL under this set's mount.
 *
 * @param {string} pathPattern - the path under the mount, as regex source.
 * @returns {RegExp} the anchored matcher.
 */
export const urlUnderBase = (pathPattern) =>
  new RegExp(`^https?://[^/]+${BASE}${pathPattern}$`)

const stubNameById = new Map(STUB_BOOK.map(({ id, name }) => [id, name]))

/** The name a happy-path party shows in the address-book picker. */
export const partyPickerName = (party) =>
  party?.name ?? stubNameById.get(party?.addressId)

export const addressBookInsetText = (party) => {
  const {
    name,
    address: { addressLine1, townOrCity, postcode, country }
  } = STUB_BOOK.find((record) => record.name === partyPickerName(party))
  return `${name} ${addressLine1} ${townOrCity}, ${postcode}, ${country}`
}

export const journeyIdFromPage = (page) => {
  const match = new URL(page.url()).pathname
    .slice(BASE.length)
    .match(/^\/notifications\/([^/]+)/)
  if (!match) throw new Error(`No journey id in URL: ${page.url()}`)
  return match[1]
}

export const journeyUrl = (page, slug = '') =>
  `${BASE}/notifications/${journeyIdFromPage(page)}${slug ? `/${slug}` : ''}`

export const chooseTodayFromDatePicker = async (page, label) => {
  const expected = await page.evaluate(() => {
    const date = new Date()
    const days = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ]
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ]
    return {
      accessibleName: `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`,
      inputValue: `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
    }
  })
  const dialog = await openDatePicker(page, label)
  await dialog
    .getByRole('button', { name: expected.accessibleName, exact: true })
    .click()
  return expected.inputValue
}

const datePickerOf = (page, label) =>
  page.locator('.moj-datepicker', { has: page.getByLabel(label) })

const dateToggleOf = (page, label) =>
  datePickerOf(page, label).getByRole('button', { name: 'Choose date' })

/** Opens the named date field's calendar with the mouse and returns its dialog. */
export const openDatePicker = async (page, label) => {
  await dateToggleOf(page, label).click()
  const dialog = datePickerOf(page, label).getByRole('dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

/**
 * The width of an element's content box, without its padding.
 *
 * @param {import('@playwright/test').Locator} locator
 * @returns {Promise<number>}
 */
export const contentWidthOf = (locator) =>
  locator.evaluate((el) => {
    const style = window.getComputedStyle(el)
    return (
      el.clientWidth -
      Number.parseFloat(style.paddingLeft) -
      Number.parseFloat(style.paddingRight)
    )
  })

const withinGridColumn = (locator, widthClass) =>
  locator.locator(
    `xpath=ancestor::*[contains(@class,"govuk-grid-column-${widthClass}")]`
  )

/**
 * The two-thirds grid column holding a locator, matching nothing when the
 * locator sits outside one.
 *
 * @param {import('@playwright/test').Locator} locator
 * @returns {import('@playwright/test').Locator}
 */
export const withinTwoThirdsColumn = (locator) =>
  withinGridColumn(locator, 'two-thirds')

/**
 * The full-width grid column holding a locator, matching nothing when the
 * locator sits outside one.
 *
 * @param {import('@playwright/test').Locator} locator
 * @returns {import('@playwright/test').Locator}
 */
export const withinFullWidthColumn = (locator) =>
  withinGridColumn(locator, 'full')

/** Selects the page's journey form. */
export const JOURNEY_FORM_SELECTOR = 'form[method="post"]'

/**
 * The page's journey form, the one that posts the page's answers.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {import('@playwright/test').Locator}
 */
export const journeyFormOf = (page) => page.locator(JOURNEY_FORM_SELECTOR)

/**
 * Fails unless the page's search box has its hint and one button,
 * named as the copy says, joined flush to its right edge, together
 * `expectedWidth` wide.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ search: { label: string, hint: string, button: string }, expectedWidth: number }} options
 */
export const expectSearchBoxJoinedToItsButton = async (
  page,
  { search, expectedWidth }
) => {
  const box = page.getByLabel(search.label, { exact: true })
  const button = page.getByRole('button', {
    name: search.button,
    exact: true
  })
  const wrapper = page.locator('.moj-search__input-wrapper', { has: box })

  await expect(box).toHaveAccessibleDescription(search.hint)
  await expect(wrapper.getByRole('button')).toHaveCount(1)
  await expect(button).toBeVisible()

  const boxEdge = await box.evaluate((el) => el.getBoundingClientRect().right)
  const buttonEdge = await button.evaluate(
    (el) => el.getBoundingClientRect().left
  )
  expect(buttonEdge).toBeCloseTo(boxEdge, 0)

  const { width } = await wrapper.boundingBox()
  const widthTolerancePx = 1
  expect(Math.abs(width - expectedWidth)).toBeLessThanOrEqual(widthTolerancePx)
}

/**
 * Presses Enter in the box with JavaScript off and fails unless the server
 * keeps the term and refuses nothing.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ search: { label: string }, term: string }} options
 */
export const searchByPressingEnter = async (page, { search, term }) => {
  const box = page.getByLabel(search.label, { exact: true })
  await box.fill(term)
  await Promise.all([page.waitForEvent('load'), box.press('Enter')])
  await expect(box).toHaveValue(term)
  await expect(page.getByRole('alert')).toHaveCount(0)
}

const expectCalendarEndsAboveNextQuestion = async (
  page,
  label,
  nextQuestionLabel
) => {
  const dialog = await openDatePicker(page, label)
  await expect(nextQuestionLabel).toBeVisible()
  const calendarBottom = await documentBottom(dialog)
  const nextQuestionTop = await documentTop(nextQuestionLabel)

  expect(calendarBottom).toBeLessThanOrEqual(nextQuestionTop)
}

export const describeCalendarPosition = ({
  fieldName,
  label,
  nextQuestionLabel
}) => {
  test(`the ${fieldName} calendar ends above the next question`, async ({
    page
  }) => {
    await expectCalendarEndsAboveNextQuestion(
      page,
      label,
      nextQuestionLabel(page)
    )
  })
}

export const { values } = JSON.parse(
  readFileSync(
    new URL(
      '../src/server/app/sets/live-animals/journeys/linear/flow/fixtures/happy-path.json',
      import.meta.url
    ),
    'utf8'
  )
)

const arrivalDate = addUtcMonths(new Date(), 1)
export const ARRIVAL_DATE_IN_WINDOW = formatDateText(arrivalDate)

const formatArrivalDateForDisplay = (date) => {
  const shortMonths = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ]
  return `${date.getUTCDate()} ${shortMonths[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}
export const ARRIVAL_DATE_IN_WINDOW_DISPLAY =
  formatArrivalDateForDisplay(arrivalDate)

/**
 * Starts a notification from the dashboard and stops on the origin page.
 *
 * @param {import('@playwright/test').Page} page
 */
export const startNotificationAtOrigin = async (page) => {
  await page.goto(BASE)
  await page.getByRole('button', { name: 'Start a new notification' }).click()
  await expect(page).toHaveURL(urlUnderBase('/notifications/[^/]+/origin'))
  await expect(
    page.getByRole('heading', { name: originCopy.title })
  ).toBeVisible()
}

/**
 * Chooses a type-ahead option by its field's visible label: the enhanced
 * search box with JavaScript, the native select without it.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ label: string, optionName: string, query?: string, inputId?: string }} field
 *   - `query` is the text typed into the search box, defaulting to the option's name.
 *   - `inputId` scopes the label lookup to one form group when the page shows
 *   the same label more than once.
 */
export const chooseTypeAheadOption = async (
  page,
  { label, optionName, query = optionName, inputId }
) => {
  await page.waitForLoadState('domcontentloaded')
  const scope = inputId
    ? page.locator(`#${inputId}`).locator(FORM_GROUP_ANCESTOR_XPATH)
    : page
  const field = scope.getByLabel(label, { exact: true })
  if ((await field.evaluate((el) => el.tagName)) === 'SELECT') {
    await field.selectOption({ label: optionName })
    return
  }
  await field.click()
  await field.fill(query)
  await page.getByRole('option', { name: optionName, exact: true }).click()
}

export const chooseCountryOfOrigin = (
  page,
  name = COUNTRY_LABELS[values.countryOfOrigin]
) =>
  chooseTypeAheadOption(page, {
    label: originCopy.country.label,
    query: name,
    optionName: name
  })

export const answerOriginEntry = async (page) => {
  await chooseCountryOfOrigin(page)
  await page.getByRole('radio', { name: 'No' }).check()
  await save(page)
}

const startNotificationWithOriginAnswered = async (page) => {
  await startNotificationAtOrigin(page)
  await answerOriginEntry(page)
}

/**
 * Asserts the overview page is showing.
 *
 * @param {import('@playwright/test').Page} page
 */
export const expectOverview = (page) =>
  expect(page.getByRole('heading', { name: hubCopy.title })).toBeVisible()

/**
 * Opens the notification's overview, then the page at `slug`.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} slug - the page's slug within the notification.
 */
export const visitOverviewThenOpen = async (page, slug) => {
  await page.goto(journeyUrl(page))
  await page.goto(journeyUrl(page, slug))
}

/**
 * The URL of the notification view of the notification the page is on.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {string}
 */
export const notificationViewUrl = (page) =>
  journeyUrl(page, 'notification-view')

/**
 * Opens the notification view of the notification the page is on.
 *
 * @param {import('@playwright/test').Page} page
 */
export const openNotificationView = (page) =>
  page.goto(notificationViewUrl(page))

/**
 * Makes the origin country select offer a country the page does not.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} [code] - the code and label of the extra option.
 */
export const chooseOutOfListCountry = (page, code = 'XX') =>
  page
    .locator('select#countryOfOrigin-select')
    .evaluate((select, outOfListCode) => {
      const option = document.createElement('option')
      option.value = outOfListCode
      option.textContent = outOfListCode
      select.append(option)
      select.value = outOfListCode
    }, code)

/**
 * The row of the added-documents table that mentions a reference.
 *
 * @param {import('@playwright/test').Page | import('@playwright/test').Locator} scope
 * @param {string} reference
 * @returns {import('@playwright/test').Locator}
 */
export const documentRowFor = (scope, reference) =>
  scope.locator('.govuk-table__row', { hasText: reference })

/**
 * Starts a notification, answers origin and stops on the overview.
 *
 * @param {import('@playwright/test').Page} page
 */
export const startNotification = async (page) => {
  await startNotificationWithOriginAnswered(page)
  await page.goto(journeyUrl(page))
  await expectOverview(page)
}

/**
 * Starts a notification, answers origin and stops on the import reason page.
 *
 * @param {import('@playwright/test').Page} page
 */
export const startNotificationAtImportReason = async (page) => {
  await startNotificationWithOriginAnswered(page)
  await page.goto(journeyUrl(page, 'import-reason'))
  await expect(
    page.getByRole('heading', { name: importReasonCopy.title })
  ).toBeVisible()
}

/**
 * Starts a notification and carries the opening run through the origin and
 * commodity pages to the import reason page.
 *
 * @param {import('@playwright/test').Page} page
 */
export const carryOpeningRunToImportReason = async (page) => {
  await startNotificationAtOrigin(page)

  await answerOriginDetails(page)
  await expect(
    page.getByRole('heading', { name: commoditiesCopy.search.title })
  ).toBeVisible()

  await answerWhatYouAreImporting(page)
  await expect(
    page.getByRole('heading', { name: importReasonCopy.title })
  ).toBeVisible()
}

export const choosePortOfEntry = (page, option) => {
  const fixturePort = PORTS.find((port) => port.code === values.portOfEntry)
  const chosenOption = option ?? `${fixturePort.name} - ${fixturePort.code}`
  return chooseTypeAheadOption(page, {
    label: transportCopy.portOfEntry.port.label,
    query: chosenOption,
    optionName: chosenOption
  })
}

export const answerCountryOfOrigin = async (page) => {
  await page
    .getByRole('link', { name: 'Where is this consignment coming from?' })
    .click()
  await chooseCountryOfOrigin(page)
  await page.getByRole('radio', { name: 'No' }).check()
  await save(page)
  await expectOverview(page)
}

export const searchCommodities = async (page, query) => {
  await page.getByLabel('Search for a commodity').fill(query)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
}

const tickSpecies = (page, { commodityCode, speciesLatinName }) =>
  page
    .getByRole('group', { name: commodityCode })
    .getByRole('checkbox', { name: speciesLatinName, exact: true })
    .check()

export const selectSpecies = async (page, speciesToSelect) => {
  for (const chosen of speciesToSelect) {
    await searchCommodities(page, chosen.speciesLatinName)
    await tickSpecies(page, chosen)
  }
}

export const animalsQuantityInputUnder = (page, { speciesLatinName }) =>
  page
    .getByRole('heading', { level: 3, name: speciesLatinName })
    .locator('+ .govuk-form-group')
    .getByLabel('Number of animals')

export const openCommoditySearch = async (page) => {
  await startNotification(page)
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  await expect(
    page.getByRole('heading', { name: 'What are you importing?' })
  ).toBeVisible()
}

export const openCommodityDetails = async (page, speciesToSelect) => {
  await openCommoditySearch(page)
  await selectSpecies(page, speciesToSelect)
  await save(page)
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await page
    .getByRole('link', { name: 'Commodity details', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Commodity details' })
  ).toBeVisible()
}

export const expectSpeciesSelected = async (
  page,
  { commodityCode, speciesLatinName }
) =>
  expect(
    page
      .getByRole('heading', { name: /\d+ selected/ })
      .locator('+ ul')
      .getByRole('listitem')
      .filter({ hasText: `${commodityCode}:` })
      .filter({ hasText: speciesLatinName })
  ).toBeVisible()

export const unlockSections = async (page, chosen = FELIS_CATUS) => {
  await answerCountryOfOrigin(page)
  await answerWhatYouAreImportingFromOverview(page, chosen)
  await page.getByRole('link', { name: 'Commodity details' }).click()
  await expect(
    page.getByRole('heading', { name: 'Commodity details' })
  ).toBeVisible()
  await page.getByLabel('Number of animals').fill('1')
  await save(page)
  await expectOverview(page)
}

export const setUploadFile = (
  page,
  filename,
  bytes,
  mimeType = 'application/pdf'
) => {
  const setFileTimeoutMs = 60_000
  return page.locator('input[type="file"]').setInputFiles(
    {
      name: filename,
      mimeType,
      buffer: bytes ?? Buffer.from('%PDF-1.4 test upload')
    },
    { timeout: setFileTimeoutMs }
  )
}

/**
 * Opens the document upload page from a fresh notification with the origin,
 * commodity and commodity details answered.
 *
 * @param {import('@playwright/test').Page} page
 */
export const openDocuments = async (page) => {
  await startNotification(page)
  await unlockSections(page)
  await page.getByRole('link', { name: 'Upload documents' }).click()
  await expect(
    page.getByRole('heading', { name: documentsCopy.title })
  ).toBeVisible()
}

export const addDocument = async (page, entry) => {
  await page
    .getByLabel('Document reference')
    .fill(entry.accompanyingDocumentReference)
  await page
    .getByLabel('Document type')
    .selectOption(entry.accompanyingDocumentType)
  const issued = entry.accompanyingDocumentDateOfIssue
  await page
    .getByLabel('Date of issue')
    .fill(`${issued.day}/${issued.month}/${issued.year}`)
  await setUploadFile(page, entry.filename)
  await page.getByRole('button', { name: 'Save and add another' }).click()
}

const save = (page) => saveAndContinue(page).click()

export const answerOriginDetails = async (
  page,
  {
    countryName,
    regionCode = values.regionOfOriginCode.slice(
      `${values.countryOfOrigin}-`.length
    ),
    internalReference = values.internalReferenceNumber
  } = {}
) => {
  await chooseCountryOfOrigin(page, countryName)
  await page.getByRole('radio', { name: 'Yes' }).check()
  await page
    .getByLabel('Enter the region of origin code', { exact: true })
    .fill(regionCode)
  await page
    .getByLabel('Your internal reference for this consignment (optional)')
    .fill(internalReference)
  await save(page)
}

export const answerWhatYouAreImporting = async (page, chosen = BOS_TAURUS) => {
  await selectSpecies(page, [chosen])
  await save(page)
}

export const answerWhatYouAreImportingFromOverview = async (page, chosen) => {
  await page.getByRole('link', { name: hubCopy.rows.commodities.title }).click()
  await answerWhatYouAreImporting(page, chosen)
  await expectOverview(page)
}

export const answerCommodityCounts = async (page) => {
  const [line] = values.commodityLines
  await expect(
    page.getByRole('heading', { name: 'Commodity details' })
  ).toBeVisible()
  await page.getByLabel('Number of animals').fill(line.numberOfAnimalsQuantity)
  await page
    .getByLabel('Number of packages (when required)')
    .fill(line.numberOfPackages)
  await save(page)
}

export const answerAnimalIdentification = async (page) => {
  const [unit] = values.commodityLines[0].animalIdentifiers
  await expect(
    page.getByRole('heading', { name: 'Identification details', exact: true })
  ).toBeVisible()
  await page
    .getByLabel('Ear tag', { exact: true })
    .fill(unit.animalIdentifierEarTag)
  await save(page)
}

export const answerImportReason = async (page) => {
  await page.getByRole('radio', { name: 'Internal market' }).check()
  await page.getByRole('radio', { name: 'Breeding' }).check()
  await save(page)
}

export const answerAdditionalDetails = async (page) => {
  await expect(
    page.getByRole('heading', { name: 'Additional details', exact: true })
  ).toBeVisible()
  await page.getByRole('radio', { name: 'Slaughter' }).check()
  await page
    .getByRole('group', {
      name: 'Does the consignment contain any unweaned animals?'
    })
    .getByRole('radio', { name: 'No' })
    .check()
  await save(page)
}

export const addressesSection = (page, heading) =>
  page.getByRole('region', { name: heading, exact: true })

export const answerRolesAndAddresses = async (page) => {
  const parties = [
    ['Add a consignor', partyPickerName(values.consignor)],
    ['Add a place of destination', partyPickerName(values.placeOfDestination)],
    ['Add a place of origin', partyPickerName(values.placeOfOrigin)],
    ['Add a consignee', partyPickerName(values.consignee)],
    ['Add an importer', partyPickerName(values.importer)]
  ]
  for (const [addLink, name] of parties) {
    await page.getByRole('link', { name: addLink, exact: true }).click()
    await page.getByRole('radio', { name }).check()
    await save(page)
  }
  await answerCphNumberFromAddLink(page)
  await save(page)
}

export const answerCphNumber = async (page) => {
  const [county, parish, holding] = values.countyParishHoldingCph.split('/')
  await expect(
    page.getByRole('heading', {
      name: 'Add the county parish holding number (CPH)'
    })
  ).toBeVisible()
  await page.getByLabel('County', { exact: true }).fill(county)
  await page.getByLabel('Parish', { exact: true }).fill(parish)
  await page.getByLabel('Holding number', { exact: true }).fill(holding)
  await save(page)
}

export const openCphNumberFromAddLink = async (page) => {
  await page
    .getByRole('link', { name: 'Add a CPH number', exact: true })
    .click()
}

export const answerCphNumberFromAddLink = async (page) => {
  await openCphNumberFromAddLink(page)
  await answerCphNumber(page)
  await expect(
    page.getByRole('heading', { name: 'Consignment addresses' })
  ).toBeVisible()
}

export const MEANS_OF_TRANSPORT_SELECT = 'select#meansOfTransport'

export const answerArrivalDetails = async (page) => {
  await page
    .getByLabel('Arrival date at port of entry')
    .fill(ARRIVAL_DATE_IN_WINDOW)
  await choosePortOfEntry(page)
  await page
    .locator(MEANS_OF_TRANSPORT_SELECT)
    .selectOption(values.meansOfTransport)
  await page
    .getByLabel('Transport identification')
    .fill(values.transportIdentification)
  await page
    .getByLabel('Transport document reference')
    .fill(values.transportDocumentReference)
  await save(page)
}

export const addTransitCountry = async (page, name) => {
  await chooseTypeAheadOption(page, {
    label: transportCopy.transitCountries.country.label,
    query: name,
    optionName: name
  })
  await page.getByRole('button', { name: 'Add country', exact: true }).click()
  await expect(page.getByRole('cell', { name, exact: true })).toBeVisible()
}

export const answerTransitCountries = async (page) => {
  await addTransitCountry(page, 'France')
  await addTransitCountry(page, 'Belgium')
  await save(page)
}

/**
 * Opens the arrival details page from a fresh notification with the origin,
 * commodity and commodity details answered.
 *
 * @param {import('@playwright/test').Page} page
 */
export const openArrival = async (page) => {
  await startNotification(page)
  await unlockSections(page)
  await page
    .getByRole('link', { name: transportCopy.portOfEntry.title })
    .click()
  await expect(
    page.getByRole('heading', { name: transportCopy.portOfEntry.title })
  ).toBeVisible()
}

/**
 * Opens the transit countries page from a fresh notification, arriving by road.
 *
 * @param {import('@playwright/test').Page} page
 */
export const openTransit = async (page) => {
  await openArrival(page)
  await page
    .locator(MEANS_OF_TRANSPORT_SELECT)
    .selectOption(values.meansOfTransport)
  await save(page)
  await expectOverview(page)
  await page
    .getByRole('link', {
      name: hubCopy.rows.transitCountries.title,
      exact: true
    })
    .click()
  await expect(
    page.getByRole('heading', { name: transportCopy.transitCountries.title })
  ).toBeVisible()
}

export const answerTransporter = async (page) => {
  await page
    .getByRole('radio', { name: values.commercialTransporter.name })
    .check()
  await save(page)
}

export const answerContactAddress = async (page) => {
  await page
    .getByRole('radio', { name: partyPickerName(values.contactAddress) })
    .check()
  await save(page)
}

/**
 * Answers the whole notification one task row at a time.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ skipAnimalIdentification?: boolean }} [options] - pass
 *   `skipAnimalIdentification` to leave the identification row untouched.
 */
export const completeAnswerSections = async (
  page,
  { skipAnimalIdentification = false } = {}
) => {
  const task = (name) => page.getByRole('link', { name }).click()

  await task('Where is this consignment coming from?')
  await answerOriginDetails(page)

  await answerWhatYouAreImportingFromOverview(page)
  await task('Commodity details')
  await answerCommodityCounts(page)
  await expectOverview(page)

  if (!skipAnimalIdentification) {
    await task('Identification details')
    await answerAnimalIdentification(page)
    await expectOverview(page)
  }

  await task(hubCopy.rows.importReason.title)
  await answerImportReason(page)
  await expectOverview(page)
  await task('Additional details')
  await answerAdditionalDetails(page)
  await expectOverview(page)

  await task('Roles and addresses')
  await answerRolesAndAddresses(page)

  await task('Arrival details')
  await answerArrivalDetails(page)
  await expectOverview(page)
  await task('Transit countries')
  await answerTransitCountries(page)
  await expectOverview(page)
  await task('Transport details')
  await answerTransporter(page)
  await expectOverview(page)

  await task('Contact address for this consignment')
  await answerContactAddress(page)
}

export const openReviewFromHub = async (page) => {
  await page.getByRole('button', { name: 'Review and submit' }).click()
}

export const saveAndContinue = (page) =>
  page.getByRole('button', {
    name: sharedAppCopy.saveActions.saveAndContinue,
    exact: true
  })

export const saveAndReturnToHub = (page) =>
  page.getByRole('button', {
    name: sharedAppCopy.saveActions.saveAndReturnToHub,
    exact: true
  })

const cancelAndReturnToHub = (page) =>
  page.getByRole('link', {
    name: sharedAppCopy.saveActions.cancelAndReturnToHub
  })

/**
 * Fails unless the journey form offers Save and continue, Save and return to
 * overview and Cancel and return to overview in that order, with Save and
 * return to overview as the form's last button.
 *
 * @param {import('@playwright/test').Page} page
 */
export const expectThreeSaveControls = async (page) => {
  const form = journeyFormOf(page)
  const saveControls = form
    .locator(saveAndContinue(page))
    .or(form.locator(saveAndReturnToHub(page)))
    .or(form.locator(cancelAndReturnToHub(page)))

  await expect(saveControls).toHaveText([
    sharedAppCopy.saveActions.saveAndContinue,
    sharedAppCopy.saveActions.saveAndReturnToHub,
    sharedAppCopy.saveActions.cancelAndReturnToHub
  ])
  await expect(form.getByRole('button').last()).toHaveText(
    sharedAppCopy.saveActions.saveAndReturnToHub
  )
}

/**
 * Fails unless Save and continue is the journey form's last button, nothing
 * follows it in the form, and Save and return to overview is not offered.
 *
 * @param {import('@playwright/test').Page} page
 */
export const expectPageEndsWithPrimaryAlone = async (page) => {
  const form = journeyFormOf(page)
  const lastControl = form.getByRole('button').or(form.getByRole('link')).last()

  await expect(lastControl).toHaveText(
    sharedAppCopy.saveActions.saveAndContinue
  )
  await expect(saveAndReturnToHub(page)).toHaveCount(0)

  const lastVisibleChild = form.locator('> *:visible').last()
  await expect(lastVisibleChild.locator(saveAndContinue(page))).toBeVisible()
}
