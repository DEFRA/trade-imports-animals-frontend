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
import { SET_BASE } from '../src/server/app/sets/live-animals/set.js'
import { copy as commoditiesCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/commodities/copy/copy.en.js'
import { copy as documentsCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/documents/copy/copy.en.js'
import { copy as hubCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/hub/copy/copy.en.js'
import { copy as importReasonCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/import-reason/copy/copy.en.js'
import { copy as originCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/origin/copy/copy.en.js'
import { copy as transportCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/transport/copy/copy.en.js'

export { signIn } from './sign-in.js'

export const BASE = SET_BASE

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const BLOCKING_IMPACTS = ['serious', 'critical']
const JSON_INDENT = 2

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
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze()
  const blocking = results.violations
    .filter(({ impact }) => BLOCKING_IMPACTS.includes(impact))
    .filter((violation) => !isGovukConditionalRevealFalsePositive(violation))

  expect(
    blocking,
    `${subject} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, JSON_INDENT)}`
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

export const childTagsAndClassesOf = (formGroup) =>
  formGroup.evaluate((group) =>
    [...group.children].map(({ tagName, className }) => ({
      tagName,
      className
    }))
  )

export const expectedFormGroupChildren = ({
  hint,
  labelSize,
  enhanced = false
}) => [
  { tagName: 'LABEL', className: `govuk-label govuk-label--${labelSize}` },
  ...(hint ? [{ tagName: 'DIV', className: 'govuk-hint' }] : []),
  ...(enhanced ? [{ tagName: 'DIV', className: 'app-autocomplete' }] : []),
  { tagName: 'SELECT', className: 'govuk-select' }
]

/** The { code, name } of every option after the first in a country select. */
export const renderedCountriesIn = (select) =>
  select.locator('option').evaluateAll((options) =>
    options.slice(1).map((option) => ({
      code: option.value,
      name: option.textContent
    }))
  )

export const GOVUK_BLUE = 'rgb(29, 112, 184)'
export const GOVUK_BLUE_SHADE_50 = 'rgb(15, 56, 92)'
export const WHITE = 'rgb(255, 255, 255)'
const GOVUK_BLUE_SHADE_25 = 'rgb(22, 84, 138)'
const GOVUK_FOCUS = 'rgb(255, 221, 0)'
const GOVUK_FOCUS_TEXT = 'rgb(11, 12, 12)'
const GOVUK_BORDER_WIDTH = '2px'
const BLUE_ICON_BUTTON_EDGE = `${GOVUK_BLUE_SHADE_50} 0px -2px 0px 0px inset`

const documentTop = (locator) =>
  locator.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)

const documentBottom = (locator) =>
  locator.evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY)

export const computedStyle = (locator, property) =>
  locator.evaluate(
    (el, name) => window.getComputedStyle(el).getPropertyValue(name),
    property
  )

/**
 * An anchored matcher for a URL under this set's mount.
 *
 * @param {string} pathPattern - the path under the mount, as regex source.
 * @returns {RegExp} the anchored matcher.
 */
export const urlUnderBase = (pathPattern) =>
  new RegExp(`^https?://[^/]+${BASE}${pathPattern}$`)

const stubNameById = new Map(STUB_BOOK.map(({ id, name }) => [id, name]))

/** Happy-path parties may be inline ({ name }) or picker refs ({ addressId }). */
export const partyPickerName = (party) =>
  party?.name ?? stubNameById.get(party?.addressId)

export const addressBookInsetText = (party) => {
  const {
    name,
    address: { addressLine1, townOrCity, postcode, country }
  } = STUB_BOOK.find((record) => record.name === partyPickerName(party))
  return `${name} ${addressLine1} ${townOrCity}, ${postcode}, ${country}`
}

const JOURNEY_ID_IN_URL = new RegExp(`^${BASE}/notifications/([^/]+)`)

export const journeyIdFromPage = (page) => {
  const match = new URL(page.url()).pathname.match(JOURNEY_ID_IN_URL)
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
 * Fails unless the button is GOV.UK blue with a white icon, darkens on hover
 * and turns the GOV.UK focus yellow when focused.
 *
 * @param {import('@playwright/test').Locator} button
 */
export const expectBlueIconButtonLook = async (button) => {
  await expect(button).toHaveCSS('background-color', GOVUK_BLUE)
  await expect(button).toHaveCSS('color', WHITE)
  await expect(button).toHaveCSS('border-bottom-width', '0px')
  await expect(button).toHaveCSS('box-shadow', BLUE_ICON_BUTTON_EDGE)

  await button.hover()
  await expect(button).toHaveCSS('background-color', GOVUK_BLUE_SHADE_25)
  await expect(button).toHaveCSS('color', WHITE)

  await button.focus()
  await expect(button).toHaveCSS('background-color', GOVUK_FOCUS)
  await expect(button).toHaveCSS('color', GOVUK_FOCUS_TEXT)
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

/** Selects the page's journey form. */
export const JOURNEY_FORM_SELECTOR = 'form[method="post"]'

/**
 * The page's journey form, the one that posts the page's answers.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {import('@playwright/test').Locator}
 */
export const journeyFormOf = (page) => page.locator(JOURNEY_FORM_SELECTOR)

const MEDIUM_LABEL_FONT_SIZE = '24px'
const BOLD_FONT_WEIGHT = '700'
const WIDTH_TOLERANCE_PX = 1

/**
 * Fails unless the page's submitted search box has a medium label, its hint,
 * and a joined GOV.UK blue icon button named as the copy says, together
 * `expectedWidth` wide.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ search: { label: string, hint: string, button: string }, expectedWidth: number }} options
 */
export const expectSubmittedSearchLook = async (
  page,
  { search, expectedWidth }
) => {
  const box = page.getByLabel(search.label, { exact: true })
  const button = page.getByRole('button', {
    name: search.button,
    exact: true
  })
  const wrapper = page.locator('.moj-search__input-wrapper', { has: box })
  const label = box.locator(FORM_GROUP_ANCESTOR_XPATH).locator('label')

  await expect(box).toHaveAccessibleDescription(search.hint)
  await expect(label).toHaveCSS('font-size', MEDIUM_LABEL_FONT_SIZE)
  await expect(label).toHaveCSS('font-weight', BOLD_FONT_WEIGHT)
  await expect(wrapper.getByRole('button')).toHaveCount(1)
  await expect(button.locator('svg')).toBeVisible()
  await expectBlueIconButtonLook(button)

  const boxEdge = await box.evaluate((el) => el.getBoundingClientRect().right)
  const buttonEdge = await button.evaluate(
    (el) => el.getBoundingClientRect().left
  )
  expect(buttonEdge).toBeCloseTo(boxEdge, 0)

  const { width } = await wrapper.boundingBox()
  expect(Math.abs(width - expectedWidth)).toBeLessThanOrEqual(
    WIDTH_TOLERANCE_PX
  )
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

const restingBackgroundOfButton = (page, name) =>
  computedStyle(
    page.getByRole('button', { name, exact: true }),
    'background-color'
  )

const expectMouseOpenedCalendarLook = async (page, label) => {
  const primaryBackground = await restingBackgroundOfButton(
    page,
    sharedAppCopy.saveActions.saveAndContinue
  )
  const secondaryBackground = await restingBackgroundOfButton(
    page,
    sharedAppCopy.saveActions.saveAndReturnToHub
  )
  const dialog = await openDatePicker(page, label)

  await expect(dialog).toHaveCSS('outline-style', 'solid')
  await expect(dialog).toHaveCSS('outline-width', GOVUK_BORDER_WIDTH)
  await expect(dialog).toHaveCSS('outline-color', GOVUK_FOCUS_TEXT)

  const openedOnDay = dialog.locator('.moj-datepicker__button--selected')
  await expect(openedOnDay).toBeFocused()
  await expect(openedOnDay).toHaveCSS('background-color', GOVUK_BLUE)
  await expect(openedOnDay).toHaveCSS('color', WHITE)
  await expect(dialog.locator('tbody')).toHaveCSS('outline-style', 'none')

  await expect(
    dialog.getByRole('button', { name: 'Select', exact: true })
  ).toHaveCSS('background-color', primaryBackground)
  await expect(
    dialog.getByRole('button', { name: 'Close', exact: true })
  ).toHaveCSS('background-color', secondaryBackground)
}

const expectKeyboardOpenedCalendarLook = async (page, label) => {
  await dateToggleOf(page, label).focus()
  await page.keyboard.press('Enter')
  const dialog = datePickerOf(page, label).getByRole('dialog')
  await expect(dialog).toBeVisible()

  const focusedDay = dialog.locator('.moj-datepicker__button:focus')
  await expect(focusedDay).toHaveCSS('background-color', GOVUK_FOCUS)
  await expect(focusedDay).toHaveCSS('color', GOVUK_FOCUS_TEXT)
  await expect(dialog.locator('tbody')).toHaveCSS(
    'outline-width',
    GOVUK_BORDER_WIDTH
  )
  await expect(dialog.locator('tbody')).toHaveCSS('outline-color', GOVUK_FOCUS)
}

export const describeDatePickerLook = ({
  fieldName,
  label,
  nextQuestionLabel
}) => {
  test(`the ${fieldName} button that opens the calendar is GOV.UK blue with a white icon, darkens on hover and turns yellow when focused`, async ({
    page
  }) => {
    await expectBlueIconButtonLook(dateToggleOf(page, label))
  })

  test(`the ${fieldName} calendar ends above the next question`, async ({
    page
  }) => {
    await expectCalendarEndsAboveNextQuestion(
      page,
      label,
      nextQuestionLabel(page)
    )
  })

  test(`the ${fieldName} calendar opened with the mouse has a 2px black outline, the opened-on day in GOV.UK blue with white text, and Select and Close buttons matching the page's primary and secondary buttons`, async ({
    page
  }) => {
    await expectMouseOpenedCalendarLook(page, label)
  })

  test(`the ${fieldName} calendar opened with the keyboard shows the focused day and calendar body in the GOV.UK focus yellow`, async ({
    page
  }) => {
    await expectKeyboardOpenedCalendarLook(page, label)
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

const SHORT_MONTHS = [
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
export const ARRIVAL_DATE_IN_WINDOW_DISPLAY = `${arrivalDate.getUTCDate()} ${SHORT_MONTHS[arrivalDate.getUTCMonth()]} ${arrivalDate.getUTCFullYear()}`

const FIXTURE_COUNTRY = COUNTRY_LABELS[values.countryOfOrigin]

const REGION_CODE_SEPARATOR = '-'
const FIXTURE_REGION_CODE_SUFFIX = values.regionOfOriginCode.slice(
  values.countryOfOrigin.length + REGION_CODE_SEPARATOR.length
)

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
 * @param {{ label: string, query: string, optionName: string, inputId?: string }} field
 *   - `inputId` scopes the label lookup to one form group when the page shows
 *   the same label more than once.
 */
export const chooseAutocompleteByLabel = async (
  page,
  { label, query, optionName, inputId }
) => {
  await page.waitForLoadState('domcontentloaded')
  const scope = inputId
    ? page
        .locator(`#${inputId}`)
        .locator('xpath=ancestor::*[contains(@class,"govuk-form-group")][1]')
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

export const chooseCountryOfOrigin = (page, name = FIXTURE_COUNTRY) =>
  chooseAutocompleteByLabel(page, {
    label: 'Country of origin',
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
 * Opens the notification's overview, then the page at `slug`, the way the
 * trader reaches it from an overview task.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} slug - the page's slug within the notification.
 */
export const openPageFromOverview = async (page, slug) => {
  await page.goto(journeyUrl(page))
  await page.goto(journeyUrl(page, slug))
}

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

const FIXTURE_PORT = PORTS.find((port) => port.code === values.portOfEntry)
const FIXTURE_PORT_OPTION = `${FIXTURE_PORT.name} - ${FIXTURE_PORT.code}`

export const choosePortOfEntry = (page, option = FIXTURE_PORT_OPTION) =>
  chooseAutocompleteByLabel(page, {
    label: 'Port of entry',
    query: option,
    optionName: option
  })

export const answerCountryOfOrigin = async (page) => {
  await page
    .getByRole('link', { name: 'Where is this consignment coming from?' })
    .click()
  await chooseCountryOfOrigin(page)
  await page.getByRole('radio', { name: 'No' }).check()
  await page.getByRole('button', { name: 'Save and continue' }).click()
  await expectOverview(page)
}

export const searchCommodities = async (page, query) => {
  await page.getByLabel('Search for a commodity').fill(query)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
}

export const selectSpecies = async (page, speciesNames) => {
  for (const name of speciesNames) {
    await searchCommodities(page, name)
    await page.getByRole('checkbox', { name }).check()
  }
}

export const expectSpeciesSelected = async (page, name) =>
  expect(page.locator('#commodity-selection')).toContainText(name)

export const unlockSections = async (page, species = 'Felis catus') => {
  await answerCountryOfOrigin(page)
  await page.getByRole('link', { name: 'What are you importing?' }).click()
  await selectSpecies(page, [species])
  await save(page)
  await expectOverview(page)
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
) =>
  page.locator('input[type="file"]').setInputFiles({
    name: filename,
    mimeType,
    buffer: bytes ?? Buffer.from('%PDF-1.4 test upload')
  })

/**
 * Opens the document upload page from a fresh notification with the sections
 * it depends on answered.
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

const save = (page) =>
  page.getByRole('button', { name: 'Save and continue' }).click()

export const answerOriginDetails = async (
  page,
  {
    countryName,
    regionCode = FIXTURE_REGION_CODE_SUFFIX,
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

export const answerWhatYouAreImporting = async (page) => {
  await selectSpecies(page, ['Bos taurus'])
  await save(page)
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

const [FIXTURE_CPH_COUNTY, FIXTURE_CPH_PARISH, FIXTURE_CPH_HOLDING] =
  values.countyParishHoldingCph.split('/')

export const answerCphNumber = async (page) => {
  await expect(
    page.getByRole('heading', {
      name: 'Add the county parish holding number (CPH)'
    })
  ).toBeVisible()
  await page.getByLabel('County', { exact: true }).fill(FIXTURE_CPH_COUNTY)
  await page.getByLabel('Parish', { exact: true }).fill(FIXTURE_CPH_PARISH)
  await page
    .getByLabel('Holding number', { exact: true })
    .fill(FIXTURE_CPH_HOLDING)
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
  await chooseAutocompleteByLabel(page, {
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
 * Opens the arrival details page from a fresh notification with the sections
 * it depends on answered.
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

  await task('What are you importing?')
  await answerWhatYouAreImporting(page)
  await expectOverview(page)
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

/**
 * Asserts the page ends with the primary button alone: no "Save and return to
 * overview" button and no "Cancel and return to overview" link.
 *
 * @param {import('@playwright/test').Page} page
 */
export const expectPageEndsWithPrimaryAlone = async (page) => {
  await expect(
    page.getByRole('button', {
      name: sharedAppCopy.saveActions.saveAndContinue,
      exact: true
    })
  ).toBeVisible()
  await expect(
    page.getByRole('button', {
      name: sharedAppCopy.saveActions.saveAndReturnToHub
    })
  ).toHaveCount(0)
  await expect(
    page.getByRole('link', {
      name: sharedAppCopy.saveActions.cancelAndReturnToHub
    })
  ).toHaveCount(0)
}
