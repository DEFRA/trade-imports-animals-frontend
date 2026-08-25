import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'

const environment = nunjucksConfig.options.compileOptions.environment

const renderCaption = (args) =>
  environment.renderString(
    `{% from "shared/section-caption.njk" import sectionCaption %}{{ sectionCaption(${args}) }}`,
    {}
  )

describe('#sectionCaption', () => {
  it('Should name the section at the heading size the page asks for', () => {
    expect(renderCaption('"Dashboard", "govuk-caption-xl"')).toContain(
      '<span class="govuk-caption-xl">Dashboard</span>'
    )
  })

  it('Should default to the large caption used by the question pages', () => {
    expect(renderCaption('"Consignment parties"')).toContain(
      '<span class="govuk-caption-l">Consignment parties</span>'
    )
  })

  it('Should render nothing for a page the journey leaves uncaptioned', () => {
    expect(renderCaption('undefined')).not.toContain('govuk-caption')
  })
})
