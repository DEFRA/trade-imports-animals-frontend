import { load } from 'cheerio'
import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import { copy as sharedCopy } from '../shared/copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment

const renderUnauthorised = () =>
  environment.render('auth/unauthorised.njk', {
    pageTitle: sharedCopy.unauthorised.title,
    sharedCopy,
    getAssetPath: (asset) => `/assets/${asset}`
  })

const { unauthorised } = sharedCopy

describe('unauthorised page', () => {
  it('Should take its heading from the copy module', () => {
    const $ = load(renderUnauthorised())

    expect($('h1.govuk-heading-l').text().trim()).toBe(unauthorised.heading)
  })

  it('Should take its body and link text from the copy module', () => {
    const $ = load(renderUnauthorised())
    const paragraph = $('main p.govuk-body')

    expect(paragraph.text().trim()).toBe(
      `${unauthorised.bodyPrefix} ${unauthorised.signInLinkText}.`
    )
    expect(paragraph.find('a.govuk-link').text().trim()).toBe(
      unauthorised.signInLinkText
    )
  })

  it('Should send the retry link to the sign-in route', () => {
    const $ = load(renderUnauthorised())

    expect($('main p.govuk-body a.govuk-link').attr('href')).toBe(
      '/auth/sign-in'
    )
  })
})
