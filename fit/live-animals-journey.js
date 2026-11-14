import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
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
  BUBALUS_BUBALIS_ROW,
  CAPRA_HIRCUS_ROW,
  EQUUS_ASINUS_ROW,
  EQUUS_CABALUS_ROW,
  FELIS_CATUS_ROW,
  GALLUS_GALLUS_ROW,
  MUSTELA_PUTORIUS_FURO_ROW,
  OVIS_ARIES_ROW,
  STRUTHIO_ROW,
  SUS_SCROFA_DOMESTICUS_ROW,
  labelFor
} from '../src/server/app/sets/live-animals/journeys/linear/features/commodities/search/test-support.js'
import { SET_BASE } from '../src/server/app/sets/live-animals/set.js'
import { copy as additionalDetailsCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/additional-details/copy/copy.en.js'
import { copy as addressesCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/addresses/copy/copy.en.js'
import { copy as contactCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/contact/copy/copy.en.js'
import { copy as commoditiesCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/commodities/copy/copy.en.js'
import { copy as documentsCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/documents/copy/copy.en.js'
import { copy as hubCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/hub/copy/copy.en.js'
import { copy as importReasonCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/import-reason/copy/copy.en.js'
import { copy as originCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/origin/copy/copy.en.js'
import { copy as transportCopy } from '../src/server/app/sets/live-animals/journeys/linear/features/transport/copy/copy.en.js'
import {
  COMMERCIAL,
  PRIVATE,
  parties
} from '../src/server/app/services/transporters/index.js'

import { signIn } from './sign-in.js'

export { signIn }

export const BASE = SET_BASE

export {
  BISON_BISON_ROW,
  BOS_TAURUS_ROW,
  BUBALUS_BUBALIS_ROW,
  CAPRA_HIRCUS_ROW,
  EQUUS_ASINUS_ROW,
  EQUUS_CABALUS_ROW,
  FELIS_CATUS_ROW,
  GALLUS_GALLUS_ROW,
  MUSTELA_PUTORIUS_FURO_ROW,
  OVIS_ARIES_ROW,
  STRUTHIO_ROW,
  SUS_SCROFA_DOMESTICUS_ROW
}

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

/**
 * Reads computed properties of an element made only from the given class names
 * and inline styles, then removes it.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ tagName: string, className?: string, cssText?: string, focused?: boolean, properties: string[] }} reference
 * @returns {Promise<Record<string, string>>} each property's computed value.
 */
export const measureReferenceElement = (
  page,
  { tagName, className = '', cssText = '', focused = false, properties }
) =>
  page.evaluate(
    (request) => {
      const reference = document.createElement(request.tagName)
      reference.className = request.className
      reference.style.cssText = request.cssText
      document.body.append(reference)
      try {
        if (request.focused) {
          reference.focus()
        }
        const style = window.getComputedStyle(reference)
        return Object.fromEntries(
          request.properties.map((name) => [name, style.getPropertyValue(name)])
        )
      } finally {
        reference.remove()
      }
    },
    { tagName, className, cssText, focused, properties }
  )

/**
 * Reads a GOV.UK colour token as the browser resolves it.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} token - the custom property name without `--govuk-` and `-colour`, such as `error`.
 * @returns {Promise<string>} the resolved colour.
 */
export const govukColourOf = async (page, token) => {
  const { color } = await measureReferenceElement(page, {
    tagName: 'span',
    cssText: `color: var(--govuk-${token}-colour)`,
    properties: ['color']
  })
  return color
}

/**
 * Reads the computed values GOV.UK gives text it hides from sight and keeps for a screen reader.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Record<string, string>>} each property's computed value.
 */
export const govukVisuallyHiddenStyleOf = (page) =>
  measureReferenceElement(page, {
    tagName: 'span',
    className: 'govuk-visually-hidden',
    properties: ['position', 'overflow', 'white-space', 'clip-path']
  })

/**
 * Reads the computed background colour GOV.UK gives its primary button.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<Record<string, string>>} each property's computed value.
 */
export const govukPrimaryButtonStyleOf = (page) =>
  measureReferenceElement(page, {
    tagName: 'button',
    className: 'govuk-button',
    properties: ['background-color']
  })

/**
 * Fails unless the page's level 1 heading is showing with its caption, found by its text, above it.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ captionText: string, headingName: string }} options
 */
export const expectCaptionAboveHeading = async (
  page,
  { captionText, headingName }
) => {
  const heading = page.getByRole('heading', {
    level: 1,
    name: headingName,
    exact: true
  })
  const caption = page.getByRole('main').getByText(captionText, { exact: true })

  await expect(heading).toBeVisible()
  await expect(caption).toBeVisible()
  expect((await caption.boundingBox()).y).toBeLessThan(
    (await heading.boundingBox()).y
  )
}

/**
 * The page's error summary.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {import('@playwright/test').Locator}
 */
export const errorSummary = (page) => page.getByRole('alert')

/**
 * The links of the page's error summary, narrowed to the one named when a name is given.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} [name] - the link's accessible name.
 * @param {{ exact?: boolean }} [options] - exact: true matches the whole accessible name only.
 * @returns {import('@playwright/test').Locator}
 */
export const errorSummaryLinks = (page, name, { exact } = {}) =>
  errorSummary(page).getByRole('link', { name, exact })

/**
 * The page's Back link.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {import('@playwright/test').Locator}
 */
export const backLink = (page) =>
  page.getByRole('link', { name: 'Back', exact: true })

/**
 * Follows the error summary link named `message` and expects focus to land on
 * the field the link points to.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} message - the error summary link's accessible name.
 * @param {string | import('@playwright/test').Locator} field - the id of the
 *   field, or a locator for it.
 */
export const followErrorLinkToField = async (page, message, field) => {
  const link = errorSummaryLinks(page, message)
  await expect(link).toBeVisible()
  await link.click()
  const target = typeof field === 'string' ? page.locator('#' + field) : field
  await expect(target).toBeFocused()
}

export const PHONE_VIEWPORT = { width: 360, height: 740 }
export const DESKTOP_VIEWPORT = { width: 1280, height: 720 }

const documentTop = (locator) =>
  locator.evaluate((el) => el.getBoundingClientRect().top + window.scrollY)

const documentBottom = (locator) =>
  locator.evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY)

const documentRight = (locator) =>
  locator.evaluate((el) => el.getBoundingClientRect().right + window.scrollX)

/**
 * Fails unless, once the layout settles, the second element has wrapped onto a line below the
 * first and the two end on the same right edge.
 *
 * @param {import('@playwright/test').Locator} above - the element on the upper line.
 * @param {import('@playwright/test').Locator} below - the element expected to have wrapped under it.
 * @param {string} subject - names the pair in the failure message.
 */
export const expectStackedOnSameRightEdge = async (above, below, subject) => {
  await expect
    .poll(
      async () => (await documentTop(below)) - (await documentBottom(above)),
      {
        message: `${subject} share a line, so there is no stacked alignment to check`
      }
    )
    .toBeGreaterThanOrEqual(0)

  const edgeTolerancePx = 1
  await expect
    .poll(
      async () =>
        Math.abs((await documentRight(below)) - (await documentRight(above))),
      { message: `${subject} end on different right edges` }
    )
    .toBeLessThanOrEqual(edgeTolerancePx)
}

/**
 * An anchored matcher for a URL under this set's mount, with or without a trail.
 *
 * @param {string} pathPattern - the path under the mount, as regex source.
 * @returns {RegExp} the anchored matcher.
 */
export const urlUnderBase = (pathPattern) =>
  new RegExp(`^https?://[^/]+${BASE}${pathPattern}(?:[?&]from=[^#]*)?$`)

const stubNameById = new Map(STUB_BOOK.map(({ id, name }) => [id, name]))

/** The name a happy-path party shows in the address-book picker. */
export const partyPickerName = (party) =>
  party?.name ?? stubNameById.get(party?.addressId)

export const journeyIdFromPage = (page) => {
  const match = new URL(page.url()).pathname
    .slice(BASE.length)
    .match(/^\/notifications\/([^/]+)/)
  if (!match) throw new Error(`No journey id in URL: ${page.url()}`)
  return match[1]
}

export const journeyUrl = (page, slug = '') =>
  `${BASE}/notifications/${journeyIdFromPage(page)}${slug ? `/${slug}` : ''}`

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

const inUtc = (options) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options })

/** The accessible name of a date's calendar button, such as "Monday 3 March 2025", for the date's UTC day. */
export const dayLabel = (date) =>
  `${inUtc({ weekday: 'long' }).format(date)} ${date.getUTCDate()} ${inUtc({ month: 'long' }).format(date)} ${date.getUTCFullYear()}`

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

export const rowFor = (page, label) =>
  page
    .getByRole('term')
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator('..')

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
  await expect(errorSummary(page)).toHaveCount(0)
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
  await saveAndExpectLanding(page, LANDINGS.commodities)
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
 * Opens the notification's overview, then follows the link in the row titled
 * `rowTitle`.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} rowTitle - the title of the overview row to open.
 */
export const openFromOverviewRow = async (page, rowTitle) => {
  await openOverview(page)
  await page.getByRole('link', { name: rowTitle }).click()
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
  scope.getByRole('row').filter({ hasText: reference })

/**
 * Starts a notification, answers origin and stops on the overview.
 *
 * @param {import('@playwright/test').Page} page
 */
export const startNotification = async (page) => {
  await startNotificationWithOriginAnswered(page)
  await openOverview(page)
}

/**
 * Starts a notification, answers origin and opens the import reason page by address, leaving commodities unanswered.
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
 * Starts a notification and presses Save and continue through the origin and
 * commodity pages to the import reason page.
 *
 * @param {import('@playwright/test').Page} page
 */
export const saveAndContinueToImportReason = async (page) => {
  await startNotificationAtOrigin(page)

  await answerOriginDetails(page)
  await answerWhatYouAreImporting(page)
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
  await saveAndExpectLanding(page, LANDINGS.commodities)
  await openOverview(page)
}

export const searchCommodities = async (page, query) => {
  await page.getByLabel('Search for a commodity').fill(query)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
}

const tickSpecies = (page, { commodityCode, speciesLatinName }) =>
  page
    .getByRole('group', { name: commodityCode })
    .getByRole('checkbox', { name: labelFor(speciesLatinName), exact: true })
    .check()

export const selectSpecies = async (page, speciesToSelect) => {
  for (const chosen of speciesToSelect) {
    await searchCommodities(page, chosen.speciesLatinName)
    await tickSpecies(page, chosen)
  }
}

export const numberOfAnimalsFor = async (page, { speciesLatinName }) => {
  const label = labelFor(speciesLatinName)
  await page
    .getByRole('heading', { level: 3, name: label, exact: true })
    .waitFor()
  const speciesHeadings = await page
    .getByRole('heading', { level: 3 })
    .allTextContents()
  const position = speciesHeadings.indexOf(label)
  if (position === -1) {
    throw new Error(
      `No "${label}" heading among: ${speciesHeadings.join(', ')}`
    )
  }
  return page
    .getByRole('textbox', { name: 'Number of animals', exact: true })
    .nth(position)
}

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
  await saveAndReturnToHub(page).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await page
    .getByRole('link', { name: 'Commodity details', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Commodity details' })
  ).toBeVisible()
}

export const selectedSummary = (page) => page.locator('#commodity-selection')

export const expectSpeciesSelected = async (
  page,
  { commodityCode, speciesLatinName }
) => {
  const group = selectedSummary(page)
    .locator('div')
    .filter({ hasText: `${commodityCode}:` })
  await expect(
    group.getByText(`${commodityCode}:`, { exact: true })
  ).toBeVisible()
  await expect(
    group.getByRole('listitem').filter({ hasText: labelFor(speciesLatinName) })
  ).toBeVisible()
}

export const pressSpeciesRemove = (page, { speciesLatinName }) =>
  selectedSummary(page)
    .getByRole('button', {
      name: `Remove ${labelFor(speciesLatinName)}`,
      exact: true
    })
    .click()

export const unlockSections = async (page, chosen = FELIS_CATUS_ROW) => {
  await answerCountryOfOrigin(page)
  await answerWhatYouAreImportingFromOverview(page, chosen)
  await page.getByRole('link', { name: 'Commodity details' }).click()
  await expect(
    page.getByRole('heading', { name: 'Commodity details' })
  ).toBeVisible()
  await page.getByLabel('Number of animals').fill('1')
  await saveAndExpectLanding(page, LANDINGS.animalIdentification)
  await openOverview(page)
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

const save = async (page) => {
  await saveAndContinue(page).click()
}

export const LANDINGS = {
  commodities: { slug: 'commodities', title: commoditiesCopy.search.title },
  importReason: { slug: 'import-reason', title: importReasonCopy.title },
  commodityDetails: {
    slug: 'consignment-details',
    title: commoditiesCopy.consignmentDetails.title
  },
  animalIdentification: {
    slug: 'commodities/identification',
    title: commoditiesCopy.identification.title
  },
  additionalDetails: {
    slug: 'additional-details',
    title: additionalDetailsCopy.title
  },
  arrivalDetails: {
    slug: 'port-of-entry',
    title: transportCopy.portOfEntry.title
  },
  transitCountries: {
    slug: 'transit-countries',
    title: transportCopy.transitCountries.title
  },
  transporters: {
    slug: 'transporters',
    title: transportCopy.transporters.title
  },
  documents: { slug: 'accompanying-documents', title: documentsCopy.title },
  addresses: { slug: 'addresses', title: addressesCopy.hub.title },
  contactAddress: {
    slug: 'consignment/contact/select',
    title: contactCopy.title
  }
}

export const expectLanding = async (page, { slug, title }) => {
  await expect(page).toHaveURL(urlUnderBase(`/notifications/[^/]+/${slug}`))
  await expect(
    page.getByRole('heading', { name: title, exact: true })
  ).toBeVisible()
}

export const saveAndExpectLanding = async (page, landing) => {
  await save(page)
  await expectLanding(page, landing)
}

export const openOverview = async (page) => {
  await page.goto(journeyUrl(page))
  await expectOverview(page)
}

export const fillOriginDetails = async (
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
}

export const answerOriginDetails = async (page, answers) => {
  await fillOriginDetails(page, answers)
  await saveAndExpectLanding(page, LANDINGS.commodities)
}

export const answerWhatYouAreImporting = async (
  page,
  chosen = BOS_TAURUS_ROW
) => {
  await selectSpecies(page, [chosen])
  await saveAndExpectLanding(page, LANDINGS.importReason)
}

export const answerWhatYouAreImportingFromOverview = async (page, chosen) => {
  await page.getByRole('link', { name: hubCopy.rows.commodities.title }).click()
  await answerWhatYouAreImporting(page, chosen)
  await openOverview(page)
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
  await saveAndExpectLanding(page, LANDINGS.animalIdentification)
}

export const answerAnimalIdentification = async (page) => {
  const [unit] = values.commodityLines[0].animalIdentifiers
  await expect(
    page.getByRole('heading', {
      name: LANDINGS.animalIdentification.title,
      exact: true
    })
  ).toBeVisible()
  await page
    .getByLabel('Ear tag', { exact: true })
    .fill(unit.animalIdentifierEarTag)
  await saveAndExpectLanding(page, LANDINGS.additionalDetails)
}

/**
 * Saves one animal per given microchip on the open commodity line, one save
 * each. With `leavesAnimalsOutstanding`, the last save uses Save and add
 * another rather than Save and finish, so animals the line still declares stay
 * outstanding.
 */
export const identifyAnimalsByMicrochip = async (
  page,
  microchips,
  { leavesAnimalsOutstanding = false } = {}
) => {
  const microchipField = page.locator('#animalIdentifierMicrochip-0')
  for (const [index, microchip] of microchips.entries()) {
    await microchipField.fill(microchip)
    await page
      .getByRole('button', {
        name:
          index === microchips.length - 1 && !leavesAnimalsOutstanding
            ? 'Save and finish'
            : 'Save and add another'
      })
      .click()
  }
}

/**
 * Reaches the review with each chosen species at its count and no animal
 * identified.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Array<{ species: object, count: string }>} speciesCounts - the
 * species rows to select and the number of animals each holds.
 */
export const openReviewWithSpeciesCounts = async (page, speciesCounts) => {
  await openCommodityDetails(
    page,
    speciesCounts.map(({ species }) => species)
  )
  for (const { species, count } of speciesCounts) {
    await (await numberOfAnimalsFor(page, species)).fill(count)
  }
  await saveAndContinue(page).click()
  await openOverview(page)
  await openReviewFromHub(page)
}

/**
 * The saved-animals table row for the numbered animal of a species.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ speciesLatinName: string }} chosen - the species row.
 * @param {number} number - the animal's position on its card.
 * @returns {import('@playwright/test').Locator}
 */
export const savedAnimalRow = (page, chosen, number) =>
  page.getByRole('row').filter({
    hasText: commoditiesCopy.identification.animalRowNamed(
      labelFor(chosen.speciesLatinName),
      number
    )
  })

/**
 * Removes the numbered animal of a species from its saved-animals table.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ speciesLatinName: string }} chosen - the species row.
 * @param {number} number - the animal's position on its card.
 * @returns {Promise<import('@playwright/test').Locator>} the row that was removed.
 */
export const removeAnimalRow = async (page, chosen, number) => {
  const row = savedAnimalRow(page, chosen, number)
  await row
    .getByRole('button', { name: commoditiesCopy.identification.removeRow })
    .click()
  return row
}

export const answerImportReason = async (page) => {
  await page.getByRole('radio', { name: 'Internal market' }).check()
  await page.getByRole('radio', { name: 'Breeding' }).check()
  await saveAndExpectLanding(page, LANDINGS.commodityDetails)
}

export const answerAdditionalDetails = async (page) => {
  await expect(
    page.getByRole('heading', {
      name: LANDINGS.additionalDetails.title,
      exact: true
    })
  ).toBeVisible()
  await page.getByRole('radio', { name: 'Slaughter' }).check()
  await page
    .getByRole('group', {
      name: 'Does the consignment contain any unweaned animals?'
    })
    .getByRole('radio', { name: 'No' })
    .check()
  await saveAndExpectLanding(page, LANDINGS.arrivalDetails)
}

export const addressesSection = (page, heading) =>
  page.getByRole('region', { name: heading, exact: true })

export const addPlaceOfDestination = async (page) => {
  await page
    .getByRole('link', { name: 'Add a place of destination', exact: true })
    .click()
  await page
    .getByRole('radio', { name: partyPickerName(values.placeOfDestination) })
    .check()
  await saveAndExpectLanding(page, LANDINGS.addresses)
}

export const answerRolesAndAddresses = async (page) => {
  const parties = [
    ['Add a consignor', partyPickerName(values.consignor)],
    ['Add a place of origin', partyPickerName(values.placeOfOrigin)],
    ['Add a consignee', partyPickerName(values.consignee)],
    ['Add an importer', partyPickerName(values.importer)]
  ]
  for (const [addLink, name] of parties) {
    await page.getByRole('link', { name: addLink, exact: true }).click()
    await page.getByRole('radio', { name }).check()
    await saveAndExpectLanding(page, LANDINGS.addresses)
  }
  await addPlaceOfDestination(page)
  await answerCphNumberFromAddLink(page)
  await saveAndExpectLanding(page, LANDINGS.contactAddress)
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
  await saveAndExpectLanding(page, LANDINGS.addresses)
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

export const openPermanentAddressFromAddLink = async (page) => {
  await page
    .getByRole('link', { name: 'Add a permanent address', exact: true })
    .click()
}

/**
 * Answers one permanent address card, found by its heading.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} cardHeading - the card's title, such as "Felis catus 1".
 * @param {object} [newAddress] - the hand-entered address fields to fill.
 * Checks "Same as the place of destination (POD)" when omitted.
 */
export const answerPermanentAddressCard = async (
  page,
  cardHeading,
  newAddress
) => {
  const card = page.getByRole('region', { name: cardHeading, exact: true })
  if (!newAddress) {
    await card
      .getByRole('radio', { name: 'Same as the place of destination (POD)' })
      .check()
    return
  }
  await card.getByRole('radio', { name: 'Enter a new address' }).check()
  const PERMANENT_ADDRESS_FIELD_LABELS = {
    nameOrOrganisationName: 'Name or organisation name',
    addressLine1: 'Address line 1',
    addressLine2: 'Address line 2 (optional)',
    townOrCity: 'Town or city',
    county: 'County (optional)',
    postcode: 'Postcode or Zip code',
    email: 'Email address',
    phone: 'Phone number'
  }
  for (const [field, label] of Object.entries(PERMANENT_ADDRESS_FIELD_LABELS)) {
    const value = newAddress[field]
    if (value) {
      await card.getByLabel(label, { exact: true }).fill(value)
    }
  }
}

export const MEANS_OF_TRANSPORT_SELECT = 'select#meansOfTransport'

export const chooseMeansOfTransport = (page, meansOfTransport) =>
  page.locator(MEANS_OF_TRANSPORT_SELECT).selectOption(meansOfTransport)

export const fillArrivalDetails = async (page) => {
  await page
    .getByLabel('Arrival date at port of entry')
    .fill(ARRIVAL_DATE_IN_WINDOW)
  await choosePortOfEntry(page)
  await chooseMeansOfTransport(page, values.meansOfTransport)
  await page
    .getByLabel('Transport identification')
    .fill(values.transportIdentification)
  await page
    .getByLabel('Transport document reference')
    .fill(values.transportDocumentReference)
}

export const answerArrivalDetails = async (page) => {
  await fillArrivalDetails(page)
  await saveAndExpectLanding(page, LANDINGS.transitCountries)
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
  await saveAndExpectLanding(page, LANDINGS.transporters)
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
 * Chooses the means of transport, saves, checks the page Save and continue opens and returns to the overview.
 *
 * @param {import('@playwright/test').Page} page - the arrival details page.
 * @param {string} meansOfTransport - the option value to choose.
 * @param {object} expected
 * @param {{ slug: string, title: string }} expected.landing - the page Save and continue opens, one of `LANDINGS`.
 */
export const chooseMeansAndSave = async (
  page,
  meansOfTransport,
  { landing }
) => {
  await chooseMeansOfTransport(page, meansOfTransport)
  await saveAndExpectLanding(page, landing)
  await openOverview(page)
}

const saveArrivalWithMeans = async (page, meansOfTransport, { landing }) => {
  await openArrival(page)
  await chooseMeansAndSave(page, meansOfTransport, { landing })
}

/**
 * Saves the arrival details by air, a means of transport with no transit countries.
 *
 * @param {import('@playwright/test').Page} page
 */
export const saveArrivalByAir = (page) =>
  saveArrivalWithMeans(page, 'AIRPLANE', { landing: LANDINGS.transporters })

/**
 * Opens the transit countries page from a fresh notification, arriving by road.
 *
 * @param {import('@playwright/test').Page} page
 */
export const openTransit = async (page) => {
  await saveArrivalWithMeans(page, values.meansOfTransport, {
    landing: LANDINGS.transitCountries
  })
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

/**
 * Opens the transporter list from a fresh notification, arriving by air.
 *
 * @param {import('@playwright/test').Page} page
 */
export const openTransporterList = async (page) => {
  await saveArrivalByAir(page)
  await page.getByRole('link', { name: hubCopy.rows.transporter.title }).click()
  await expect(
    page.getByRole('heading', { name: transportCopy.transporters.title })
  ).toBeVisible()
}

export const cannedPrivateTransporter = parties().find(
  (record) => record.type === PRIVATE
)

export const cannedCommercialTransporter = parties().find(
  (record) => record.type === COMMERCIAL
)

/**
 * Saves the transporter list with a pick, returns to the overview and expects
 * the transporter list to show that transporter chosen.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ name: string }} transporter - the listed transporter picked.
 */
export const saveAndExpectTransporterChosen = async (page, transporter) => {
  await saveAndReturnToHub(page).click()
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible()
  await page.goto(journeyUrl(page, 'transporters'))
  await expect(
    page.getByRole('radio', { name: transporter.name })
  ).toBeChecked()
}

/**
 * Picks a transporter from the transporter list of a fresh notification
 * arriving by air, saves it, returns to the overview and expects the
 * transporter list to show that transporter chosen.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ name: string }} transporter - the listed transporter to pick.
 */
export const saveTransporterFromList = async (page, transporter) => {
  await openTransporterList(page)
  await page.getByRole('radio', { name: transporter.name }).check()
  await saveAndExpectTransporterChosen(page, transporter)
}

/**
 * Opens the transporter type question from the transporter list.
 *
 * @param {import('@playwright/test').Page} page
 */
export const openTransporterType = async (page) => {
  await openTransporterList(page)
  await page
    .getByRole('button', { name: transportCopy.transporters.add })
    .click()
  await expect(
    page.getByRole('heading', { name: transportCopy.transporterAdd.title })
  ).toBeVisible()
}

/**
 * Chooses a transporter type from the type question and reaches that type's
 * own add form.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} transporterType - `COMMERCIAL` or `PRIVATE`.
 */
export const answerTransporterType = async (page, transporterType) => {
  await openTransporterType(page)
  await chooseTransporterType(page, transporterType)
}

/**
 * Chooses a transporter type on the type question and continues to that
 * type's own add form.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} transporterType - `COMMERCIAL` or `PRIVATE`.
 */
export const chooseTransporterType = async (page, transporterType) => {
  const optionText = {
    [COMMERCIAL]: transportCopy.transporterAdd.options.Commercial.text,
    [PRIVATE]: transportCopy.transporterAdd.options.Private.text
  }
  const destinationTitle = {
    [COMMERCIAL]: transportCopy.commercialTransporterDetails.title,
    [PRIVATE]: transportCopy.privateTransporterDetails.title
  }
  await page
    .getByRole('radio', {
      name: optionText[transporterType]
    })
    .check()
  await continueTransporterType(page).click()
  await expect(
    page.getByRole('heading', {
      name: destinationTitle[transporterType]
    })
  ).toBeVisible()
}

export const answerTransporter = async (page) => {
  await page
    .getByRole('radio', { name: values.commercialTransporter.name })
    .check()
  await saveAndExpectLanding(page, LANDINGS.documents)
}

const chooseContactAddress = (page) =>
  page
    .getByRole('radio', { name: partyPickerName(values.contactAddress) })
    .check()

export const answerContactAddress = async (page) => {
  await chooseContactAddress(page)
  await save(page)
}

/**
 * Answers the whole notification one task row at a time.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ skipAnimalIdentification?: boolean, skipTransitCountries?: boolean }} [options] -
 *   pass `skipAnimalIdentification` to leave the identification row
 *   untouched, and `skipTransitCountries` to add no transit country.
 */
export const completeAnswerSections = async (
  page,
  { skipAnimalIdentification = false, skipTransitCountries = false } = {}
) => {
  const task = (name) => page.getByRole('link', { name }).click()

  await task('Where is this consignment coming from?')
  await answerOriginDetails(page)
  await openOverview(page)

  await answerWhatYouAreImportingFromOverview(page)
  await task('Commodity details')
  await answerCommodityCounts(page)
  await openOverview(page)

  if (!skipAnimalIdentification) {
    await task('Identification details')
    await answerAnimalIdentification(page)
    await openOverview(page)
  }

  await task(hubCopy.rows.importReason.title)
  await answerImportReason(page)
  await openOverview(page)
  await task('Additional details')
  await answerAdditionalDetails(page)
  await openOverview(page)

  await task('Roles and addresses')
  await answerRolesAndAddresses(page)
  await openOverview(page)

  await task('Arrival details')
  await answerArrivalDetails(page)
  await openOverview(page)
  if (!skipTransitCountries) {
    await task('Transit countries')
    await answerTransitCountries(page)
    await openOverview(page)
  }
  await task('Transport details')
  await answerTransporter(page)
  await openOverview(page)

  await task('Contact address for this consignment')
  await chooseContactAddress(page)
  await saveAndReturnToHub(page).click()
  await expectOverview(page)
}

export const openReviewFromHub = async (page) => {
  await page.getByRole('button', { name: 'Review and submit' }).click()
}

export const saveAndContinue = (page) =>
  page.getByRole('button', {
    name: sharedAppCopy.saveActions.saveAndContinue,
    exact: true
  })

export const continueTransporterType = (page) =>
  page.getByRole('button', {
    name: transportCopy.transporterAdd.continueButton,
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
 * Fails unless the primary named — Save and continue by default — is the
 * journey form's last button, nothing follows it in the form, and Save and
 * return to overview is not offered.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} [primaryName] - the primary's accessible name.
 */
export const expectPageEndsWithPrimaryAlone = async (
  page,
  primaryName = sharedAppCopy.saveActions.saveAndContinue
) => {
  const form = journeyFormOf(page)
  const lastControl = form.getByRole('button').or(form.getByRole('link')).last()

  await expect(lastControl).toHaveText(primaryName)
  await expect(saveAndReturnToHub(page)).toHaveCount(0)

  const lastVisibleChild = form.locator('> *:visible').last()
  await expect(
    lastVisibleChild.getByRole('button', { name: primaryName, exact: true })
  ).toBeVisible()
}

export const cancelAndReturnToDashboard = (page, cancelName) =>
  page.getByRole('button', { name: cancelName, exact: true })

export const expectPageEndsWithPrimaryAndCancel = async (
  page,
  cancelName,
  primaryName = sharedAppCopy.saveActions.saveAndContinue
) => {
  const form = journeyFormOf(page)
  const buttons = form.getByRole('button')

  await expect(buttons).toHaveText([primaryName, cancelName])
  await expect(saveAndReturnToHub(page)).toHaveCount(0)
  await expect(cancelAndReturnToHub(page)).toHaveCount(0)

  const lastVisibleChild = form.locator('> *:visible').last()
  await expect(
    lastVisibleChild.getByRole('button', { name: primaryName, exact: true })
  ).toBeVisible()
  await expect(
    lastVisibleChild.getByRole('button', { name: cancelName, exact: true })
  ).toBeVisible()
}

/**
 * Signs a test in as an organisation no other test shares, so a transporter
 * it adds is the only one newest in its own store.
 *
 * @param {import('@playwright/test').Page} page
 */
export const signInWithOwnTransporterStore = (page) =>
  signIn(page, { organisationId: `fit-${randomUUID()}` })

/**
 * Fails unless the transporter list is showing, under the success banner
 * naming the given transporter.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} name - the sentence-cased name the banner reads.
 */
export const expectTransporterListShowsAddedBanner = async (page, name) => {
  await expect(
    page.getByRole('heading', { name: transportCopy.transporters.title })
  ).toBeVisible()
  await expect(
    page.getByText(transportCopy.transporters.addedBanner.title)
  ).toBeVisible()
  await expect(
    page.getByText(transportCopy.transporters.addedBanner.text(name))
  ).toBeVisible()
}
