import { expect, test } from '@playwright/test'

import { axeViolations } from '../axe.e2e-helper.js'
import {
  commodityFixtures,
  completeJourney,
  fullJourneyValues,
  submitDeclaration
} from '../journey.e2e-helper.js'
import { copy as commodityFeatureCopy } from '../commodities/copy/copy.en.js'
import { copy as cyCopy } from './copy/copy.cy.js'
import { copy } from './copy/copy.en.js'
import { intendedForFinalUsersRows } from './view-model/cards/commodities.js'
import { row } from './view-model/rows/summary-row.js'

const reviewUrl =
  /^\/plant-products\/notifications\/[^/]+\/review-notification$/
const declarationUrl = /^\/plant-products\/notifications\/[^/]+\/declaration$/

const renderSummaryRow = ({ key, value, actions }) => {
  const action = actions?.items[0]
  const actionHtml = action
    ? `<dd class="govuk-summary-list__actions"><a href="${action.href}">${action.text}<span class="govuk-visually-hidden"> ${action.visuallyHiddenText}</span></a></dd>`
    : ''
  return `<div class="govuk-summary-list__row"><dt class="govuk-summary-list__key">${key.text}</dt><dd class="govuk-summary-list__value">${value.html ?? value.text}</dd>${actionHtml}</div>`
}

const renderSummaryRows = (rows) =>
  `<dl class="govuk-summary-list">${rows.map(renderSummaryRow).join('')}</dl>`

const welshAccessibleNameRows = () => {
  const scope = { has: () => true }
  const changeLinkHref = '/change'
  const missingAnswer = row({
    label: cyCopy.cards.aboutConsignment.rows.internalReference,
    value: undefined,
    obligationName: 'internalReference',
    journeyId: 'journey-083',
    scope,
    localeCopy: cyCopy,
    changeLinkHref
  })
  const [intendedForFinalUsers] = intendedForFinalUsersRows(
    'journey-083',
    scope,
    [
      {
        index: 0,
        entry: {
          commoditySelection: '06011010',
          intendedForFinalUsers: true
        }
      }
    ],
    cyCopy,
    changeLinkHref
  )

  return renderSummaryRows([missingAnswer, intendedForFinalUsers])
}

const yesNo = (value) => (value ? copy.yesNo.yes : copy.yesNo.no)
const displayedValue = (value) => value?.text ?? value

const expectAxeClean = async (page, state) => {
  const { all, seriousOrCritical } = await axeViolations(page)
  expect(
    seriousOrCritical,
    `Review notification ${state} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(all, null, 2)}`
  ).toEqual([])
}

const cardFor = (page, heading) =>
  page.locator('section').filter({
    has: page.getByRole('heading', { level: 2, name: heading, exact: true })
  })

const summaryValueByKey = (page, key, scope = page) =>
  scope
    .locator('.govuk-summary-list__row')
    .filter({
      has: page.locator('.govuk-summary-list__key', {
        hasText: new RegExp(
          `^\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`
        )
      })
    })
    .locator('.govuk-summary-list__value')

const expectSummaryValues = async (page, cards) => {
  for (const [heading, values] of cards) {
    const card = cardFor(page, heading)
    for (const [key, value] of values) {
      await expect(
        summaryValueByKey(page, key, card),
        `Summary value for "${key}" in "${heading}"`
      ).toHaveText(value)
    }
  }
}

const expectTableMatrix = async (page, caption, expectedRows) => {
  const rows = page
    .getByRole('table', { name: caption, exact: true })
    .locator('tbody tr')
  await expect(rows, `${caption} row count`).toHaveCount(expectedRows.length)
  for (const [index, expectedCells] of expectedRows.entries()) {
    await expect(
      rows.nth(index).locator('td'),
      `${caption} row ${index + 1}`
    ).toHaveText(expectedCells)
  }
}

const totalOf = (field) =>
  String(
    fullJourneyValues.commodities.lines.reduce(
      (total, line) => total + Number(line[field]),
      0
    )
  )

const summaryExpectations = (date) => {
  const { cards } = copy
  const { transport, goodsMovement, contact, traders } = fullJourneyValues
  const [firstCommodityLine] = fullJourneyValues.commodities.lines
  const traderRows = cards.traders.rows
  const traderFieldRows = (fields) =>
    Object.entries(fields).map(([field, value]) => [
      traderRows[field],
      displayedValue(value)
    ])

  return [
    [
      cards.aboutConsignment.heading,
      [
        [cards.aboutConsignment.rows.importType, fullJourneyValues.importType],
        [
          cards.aboutConsignment.rows.countryOfOrigin,
          fullJourneyValues.countryOfOrigin.text
        ],
        [
          cards.aboutConsignment.rows.countryOfConsignment,
          fullJourneyValues.countryOfConsignment.text
        ],
        [
          cards.aboutConsignment.rows.internalReference,
          fullJourneyValues.internalReference
        ],
        [
          cards.aboutConsignment.rows.reasonForImport,
          fullJourneyValues.reasonForImport
        ]
      ]
    ],
    [
      cards.commodities.heading,
      [
        [
          commodityFeatureCopy.inputMethod.heading,
          fullJourneyValues.commodities.inputMethod
        ],
        [
          `${cards.commodities.columns.intendedForFinalUsers} (commodity 1)`,
          yesNo(firstCommodityLine.intendedForFinalUsers)
        ]
      ]
    ],
    [
      cards.additionalDetails.heading,
      [
        [
          cards.additionalDetails.rows.totalGrossWeight,
          fullJourneyValues.additionalDetails.totalGrossWeight
        ],
        [
          cards.additionalDetails.rows.grossVolume,
          fullJourneyValues.additionalDetails.grossVolume
        ],
        [
          cards.additionalDetails.rows.grossVolumeUnit,
          fullJourneyValues.additionalDetails.grossVolumeUnit.text
        ],
        [cards.additionalDetails.rows.totalNetWeight, totalOf('netWeight')],
        [cards.additionalDetails.rows.totalPackages, totalOf('packages')]
      ]
    ],
    [
      cards.transport.heading,
      [
        [
          cards.transport.rows.borderControlPost,
          transport.borderControlPost.text
        ],
        [
          cards.transport.rows.inspectionPremises,
          transport.inspectionPremises.text
        ],
        [
          cards.transport.rows.meansOfTransport,
          transport.meansOfTransport.text
        ],
        [
          cards.transport.rows.transportIdentification,
          transport.identification
        ],
        [
          cards.transport.rows.transportDocumentReference,
          transport.documentReference
        ],
        [
          cards.transport.rows.arrivalDate,
          `${date.day}/${date.month}/${date.year}`
        ],
        [cards.transport.rows.arrivalTime, transport.arrivalTime.text],
        [cards.transport.rows.usesContainers, yesNo(transport.usesContainers)],
        ...transport.containers.flatMap((container, index) => {
          const number = index + 1
          return [
            [
              cards.transport.rows.containerNumber(number),
              container.containerNumber
            ],
            [cards.transport.rows.sealNumber(number), container.sealNumber],
            [
              cards.transport.rows.officialSeal(number),
              yesNo(container.officialSeal)
            ]
          ]
        })
      ]
    ],
    [
      cards.goodsMovement.heading,
      [
        [
          cards.goodsMovement.rows.commonTransitConvention,
          goodsMovement.commonTransitConvention
        ],
        [
          cards.goodsMovement.rows.movementReferenceNumber,
          goodsMovement.movementReferenceNumber
        ],
        [cards.goodsMovement.rows.usingGvms, yesNo(goodsMovement.usingGvms)]
      ]
    ],
    [
      cards.contact.heading,
      [
        [cards.contact.rows.name, contact.name],
        [cards.contact.rows.email, contact.email],
        [cards.contact.rows.telephone, contact.telephone]
      ]
    ],
    [
      cards.traders.heading,
      [
        [
          traderRows.importer,
          'Stubbed organisation, KAINOS SOFTWARE LTD, BELFAST, BT7 1NT, Northern Ireland'
        ],
        [traderRows.deliveryAddress, yesNo(traders.destinationSameAsConsignee)],
        ...traderFieldRows(traders.destination),
        ...traderFieldRows(traders.consignor),
        ...traderFieldRows(traders.packer)
      ]
    ]
  ]
}

const tableExpectations = () => {
  const lines = fullJourneyValues.commodities.lines
  return {
    [copy.cards.commodities.tables.commodities]: lines.map((line, index) => [
      `Commodity ${index + 1}`,
      line.code,
      commodityFixtures[line.code].description,
      `Change commodity ${index + 1}`
    ]),
    [copy.cards.commodities.tables.species]: lines.map((line, index) => [
      `Commodity ${index + 1}`,
      'Species 1',
      `${commodityFixtures[line.code].species}, ${commodityFixtures[line.code].eppoCode}`
    ]),
    [copy.cards.commodities.tables.varieties]: lines
      .filter((line) => line.variety)
      .map((line, index) => [
        `Commodity ${lines.indexOf(line) + 1}`,
        `${commodityFixtures[line.code].species}, ${commodityFixtures[line.code].eppoCode}`,
        line.variety.text,
        line.varietyClass.text
      ]),
    [copy.cards.commodities.tables.measures]: lines.map((line, index) => [
      `Commodity ${index + 1}`,
      line.packages,
      line.packageType.text,
      line.quantity,
      line.quantityType.text,
      line.netWeight,
      yesNo(line.controlledAtmosphereContainer),
      displayedValue(line.finishedOrPropagated),
      yesNo(line.testAndTrial)
    ]),
    [copy.cards.nominatedContacts.heading]:
      fullJourneyValues.nominatedContacts.map((contact) => [
        contact.name,
        contact.email,
        contact.telephone,
        yesNo(contact.agent)
      ]),
    [copy.cards.documents.heading]: fullJourneyValues.documents.map(
      (document) => [document.type.text, document.reference, document.date]
    )
  }
}

test.describe('plant-products review notification', () => {
  test('full journey profile keeps a middle entry and distinct identifiers in every collection', () => {
    const collections = [
      {
        name: 'commodity lines',
        entries: fullJourneyValues.commodities.lines,
        identifier: (line) => line.code
      },
      {
        name: 'containers',
        entries: fullJourneyValues.transport.containers,
        identifier: (container) => container.containerNumber
      },
      {
        name: 'nominated contacts',
        entries: fullJourneyValues.nominatedContacts,
        identifier: (contact) => contact.email
      },
      {
        name: 'documents',
        entries: fullJourneyValues.documents,
        identifier: (document) => document.reference
      }
    ]

    // Three is the minimum that provides a middle entry: pp-026's index-0
    // removal bug passed 360 unit tests and 108 of 109 browser tests without one.
    for (const { name, entries, identifier } of collections) {
      expect(
        entries.length,
        `${name} must retain at least three entries`
      ).toBeGreaterThanOrEqual(3)

      const identifiers = entries.map(identifier)
      expect(
        new Set(identifiers).size,
        `${name} identifiers must be distinct`
      ).toBe(entries.length)
    }

    const minimumDistinctValues = [
      {
        name: 'documents[].type.value',
        values: fullJourneyValues.documents.map(
          (document) => document.type.value
        ),
        minimum: 3
      },
      {
        name: 'commodities.lines[].intendedForFinalUsers',
        values: fullJourneyValues.commodities.lines.map(
          (line) => line.intendedForFinalUsers
        ),
        minimum: 2
      }
    ]

    for (const { name, values, minimum } of minimumDistinctValues) {
      expect(
        new Set(values).size,
        `${name} must retain at least ${minimum} distinct values`
      ).toBeGreaterThanOrEqual(minimum)
    }

    const booleanVariations = [
      {
        name: 'transport.containers[].officialSeal',
        values: fullJourneyValues.transport.containers.map(
          (container) => container.officialSeal
        )
      },
      {
        name: 'nominatedContacts[].agent',
        values: fullJourneyValues.nominatedContacts.map(
          (contact) => contact.agent
        )
      },
      {
        name: 'commodities.lines[].testAndTrial',
        values: fullJourneyValues.commodities.lines.map(
          (line) => line.testAndTrial
        )
      }
    ]

    // controlledAtmosphereContainer is false on every full-profile line, so
    // its true branch remains unexercised and is deliberately excluded here.
    for (const { name, values } of booleanVariations) {
      expect(
        values.includes(true) && values.includes(false),
        `${name} must include both true and false`
      ).toBe(true)
    }
  })

  test('renders distinct Welsh accessible names with locale-owned connectors', async ({
    page
  }) => {
    await page.setContent(await welshAccessibleNameRows())

    const missingAnswerRow = page
      .locator('.govuk-summary-list__row')
      .filter({ has: page.getByText('Cyfeirnod mewnol', { exact: true }) })
    const intendedForFinalUsersRow = page
      .locator('.govuk-summary-list__row')
      .filter({
        has: page.getByText(
          'Wedi’i fwriadu ar gyfer defnyddwyr terfynol (nwydd 1)',
          { exact: true }
        )
      })
    const missingAnswerLink = missingAnswerRow.getByRole('link')
    const intendedForFinalUsersLink = intendedForFinalUsersRow.getByRole('link')

    await expect(missingAnswerLink).toHaveAccessibleName(
      'Ychwanegu ateb sydd ar goll ar gyfer cyfeirnod mewnol'
    )
    await expect(intendedForFinalUsersLink).toHaveAccessibleName(
      'Newid wedi’i fwriadu ar gyfer defnyddwyr terfynol ar gyfer nwydd 1'
    )
    expect(await missingAnswerLink.ariaSnapshot()).not.toBe(
      await intendedForFinalUsersLink.ariaSnapshot()
    )
  })

  test('reads back the fully populated journey, pins collection order and exposes distinct Change names', async ({
    page
  }) => {
    test.slow()
    const { reference, date } = await completeJourney(page, {
      profile: 'full'
    })

    await expect(
      page.getByRole('heading', { level: 1, name: copy.title, exact: true })
    ).toHaveClass(/govuk-heading-xl/)
    await expect(page.getByText(reference, { exact: true })).toBeVisible()

    await expectSummaryValues(page, summaryExpectations(date))
    for (const [caption, expectedRows] of Object.entries(tableExpectations())) {
      await expectTableMatrix(page, caption, expectedRows)
    }
    for (const caption of Object.values(copy.cards.commodities.tables)) {
      const commodityCaption = page
        .getByRole('table', { name: caption, exact: true })
        .locator('caption')
      await expect(commodityCaption).toBeVisible()
      await expect(commodityCaption).toHaveClass(/govuk-table__caption--s/)
      await expect(commodityCaption).not.toHaveClass(/govuk-visually-hidden/)
    }
    for (const caption of [
      copy.cards.nominatedContacts.heading,
      copy.cards.documents.heading
    ]) {
      const duplicateTable = page.getByRole('table', {
        name: caption,
        exact: true
      })
      const duplicateCaption = duplicateTable.locator('caption')
      await expect(duplicateTable).toMatchAriaSnapshot(`
        - caption: ${caption}
      `)
      await expect(duplicateCaption).toHaveClass(/govuk-visually-hidden/)
      await expect(duplicateCaption).toHaveCSS('position', 'absolute')
      await expect(duplicateCaption).toHaveCSS('width', '1px')
      await expect(duplicateCaption).toHaveCSS('height', '1px')
      await expect(duplicateCaption).toHaveCSS('overflow', 'hidden')
      await expect(duplicateCaption).toHaveCSS(
        'clip',
        'rect(0px, 0px, 0px, 0px)'
      )
      await expect(duplicateCaption).not.toHaveClass(/govuk-table__caption--s/)
    }

    const manualInputMethodRow = page
      .locator('.govuk-summary-list__row')
      .filter({
        has: page.getByText(
          commodityFeatureCopy.inputMethod.options.MANUAL.label,
          { exact: true }
        )
      })
    await expect(
      manualInputMethodRow.getByRole('link', {
        name: `Change ${commodityFeatureCopy.inputMethod.heading}`,
        exact: true
      })
    ).toBeVisible()

    const changeLinks = page.getByRole('link', { name: /^Change / })
    const names = await changeLinks.evaluateAll((links) =>
      links.map((link) => (link.textContent ?? '').trim().replace(/\s+/g, ' '))
    )
    expect(names.length).toBeGreaterThan(30)
    for (const name of names) expect(name).toMatch(/^Change .+/)
    expect(new Set(names).size).toBe(names.length)
    await expect(
      page.getByRole('link', { name: 'Change', exact: true })
    ).toHaveCount(0)

    await expectAxeClean(page, 'fully populated state')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page).toHaveURL((url) => declarationUrl.test(url.pathname))
    await expect(
      page.getByRole('heading', { level: 1, name: 'Declaration', exact: true })
    ).toBeVisible()
  })

  test('SUBMITTED review renders answers with no edit affordance or resubmission form', async ({
    page
  }) => {
    test.slow()
    await completeJourney(page, { profile: 'full' })
    const submittedReviewUrl = page.url()

    await page.getByRole('link', { name: 'Back', exact: true }).click()
    await submitDeclaration(page)
    await page.goto(submittedReviewUrl)

    await expect(
      page.getByRole('heading', { level: 1, name: copy.title, exact: true })
    ).toBeVisible()
    await expect(
      summaryValueByKey(
        page,
        copy.cards.aboutConsignment.rows.internalReference
      )
    ).toHaveText(fullJourneyValues.internalReference)
    await expect(
      page.getByRole('cell', {
        name: fullJourneyValues.commodities.lines[0].code,
        exact: true
      })
    ).toBeVisible()

    await expect(page.locator('a[href*="change=1"]')).toHaveCount(0)
    await expect(
      page.getByRole('columnheader', {
        name: copy.cards.commodities.columns.action,
        exact: true
      })
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: copy.continue, exact: true })
    ).toHaveCount(0)
    const postForms = page.locator('main form[method="post"]')
    await expect(postForms).toHaveCount(1)
    await expect(postForms).toHaveAttribute('action', /\/copy$/)
  })

  test('saving an edited country of origin returns to the review page with the new value', async ({
    page
  }) => {
    test.slow()
    await completeJourney(page, { profile: 'full' })

    await page.getByRole('link', { name: 'Change Country of origin' }).click()
    await expect(page).toHaveURL((url) => {
      return (
        url.pathname.endsWith('/country-of-origin') &&
        url.searchParams.get('change') === '1'
      )
    })
    await page.getByLabel('Country of origin').selectOption('NL')
    await page.getByRole('button', { name: 'Save and continue' }).click()
    await expect(page).toHaveURL((url) => reviewUrl.test(url.pathname))
    await expect(
      summaryValueByKey(page, copy.cards.aboutConsignment.rows.countryOfOrigin)
    ).toHaveText('Netherlands')
  })

  test('omits every out-of-scope row, shows the empty state and passes axe with missing answers', async ({
    page
  }) => {
    test.slow()
    await completeJourney(page, { profile: 'minimal' })

    await expect(page.getByText('Movement Reference Number (MRN)')).toHaveCount(
      0
    )
    await expect(page.getByText(/^Container \d/)).toHaveCount(0)
    await expect(page.getByText('Gross volume unit')).toHaveCount(0)
    await expect(page.getByText('Delivery address name')).toHaveCount(0)
    await expect(page.getByRole('table', { name: 'Varieties' })).toHaveCount(0)
    await expect(page.getByText(/Intended for final users/)).toHaveCount(0)
    await expect(page.getByText('Packer name')).toHaveCount(0)
    await expect(page.getByText('No nominated contacts added')).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Add a missing answer/ }).first()
    ).toBeVisible()

    await expectAxeClean(page, 'missing-answer state')
  })
})
