import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../../../../../../../config/nunjucks/nunjucks.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { copy as sharedCopy } from '../../../../../../../shared/copy.en.js'
import { copy as cy } from './copy.cy.js'
import { copy as en } from './copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment

const shape = (value) =>
  Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      child !== null && typeof child === 'object' ? shape(child) : typeof child
    ])
  )

describe('plant-products confirmation copy', () => {
  it('keeps English and Welsh structure-identical', () => {
    expect(shape(cy)).toEqual(shape(en))
    expect(en.warningFallbackText).toBe('Warning')
    expect(cy.warningFallbackText).toBe('Rhybudd')
  })

  it('pins the English confirmation copy', () => {
    expect(en).toEqual({
      title: 'Import notification sent',
      panel: {
        title: 'Import notification sent',
        referencePrefix: 'Your reference number'
      },
      references: {
        notificationLabel: 'Notification reference',
        customsLabel: 'Reference for your customs declaration',
        documentCodeLabel: 'Customs document code'
      },
      inspection: {
        label: 'Inspection status',
        notRequired: 'Not required'
      },
      warning:
        'You must use the correct reference and code on the customs declaration or your consignment will be delayed.',
      warningFallbackText: 'Warning',
      whatYouNeedToDo: {
        heading: 'What you need to do',
        noInspection:
          'Tell the haulier that this consignment does not need an inspection.',
        canChange: 'Initial risk assessments can change.'
      },
      whatHappensNext: {
        heading: 'What happens next',
        inspectorMayUpdate: 'An inspector may update the risk assessment.',
        ifChanges:
          'If the risk assessment changes, we will notify you and any nominated contacts by text message or email.'
      },
      viewOrAmend: {
        heading: 'How to view or amend this notification',
        body: 'You can view or amend this notification from your dashboard.',
        dashboardLink: 'Return to your dashboard'
      },
      createLink: 'Create a new notification'
    })
  })

  it('renders the Welsh warning fallback text from the feature copy', () => {
    const copy = copyFor({ en, cy }, 'cy')
    const html = environment.render(
      'plant-products/journeys/linear/features/confirmation/template.njk',
      {
        copy,
        pageTitle: copy.title,
        sharedCopy,
        getAssetPath: (asset) => `/assets/${asset}`,
        referenceNumber: 'GBN-PP-26-123456',
        customsDeclarationReference: 'GBN-PP-26-123456',
        customsDocumentCode: 'C085',
        inspectionStatus: copy.inspection.notRequired,
        dashboardHref: '/plant-products'
      }
    )
    const $ = load(html)

    expect(copy).toBe(cy)
    expect($('.govuk-warning-text .govuk-visually-hidden').text().trim()).toBe(
      cy.warningFallbackText
    )
  })
})
