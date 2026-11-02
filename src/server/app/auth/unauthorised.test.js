import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import {
  documentOf,
  trimmedTextOf
} from '../../common/test-helpers/document-of.js'
import { copy as sharedCopy } from '../shared/copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment

const renderUnauthorised = () =>
  documentOf(
    environment.render('auth/unauthorised.njk', {
      pageTitle: sharedCopy.unauthorised.title,
      sharedCopy,
      getAssetPath: (asset) => `/assets/${asset}`
    })
  )

const { unauthorised } = sharedCopy

describe('unauthorised page', () => {
  it('Should take its heading from the copy module', () => {
    const document = renderUnauthorised()

    expect(trimmedTextOf(document.querySelector('h1.govuk-heading-l'))).toBe(
      unauthorised.heading
    )
  })

  it('Should take its body and link text from the copy module', () => {
    const paragraph = renderUnauthorised().querySelector('main p.govuk-body')

    expect(trimmedTextOf(paragraph)).toBe(
      `${unauthorised.bodyPrefix} ${unauthorised.signInLinkText}.`
    )
    expect(trimmedTextOf(paragraph.querySelector('a.govuk-link'))).toBe(
      unauthorised.signInLinkText
    )
  })

  it('Should send the retry link to the sign-in route', () => {
    const link = renderUnauthorised().querySelector(
      'main p.govuk-body a.govuk-link'
    )

    expect(link.getAttribute('href')).toBe('/auth/sign-in')
  })
})
