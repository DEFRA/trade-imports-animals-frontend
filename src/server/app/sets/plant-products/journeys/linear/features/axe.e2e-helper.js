import AxeBuilder from '@axe-core/playwright'

const isPermittedConditionalRadioViolation = (
  { id, nodes },
  permittedConditionalRadio
) =>
  // Pin the GOV.UK conditional-radio false positive to its page-specific
  // aria-controls value and exact selector; every other node stays fatal.
  Boolean(permittedConditionalRadio) &&
  id === 'aria-allowed-attr' &&
  nodes.length > 0 &&
  nodes.every(
    ({ html, target }) =>
      html.includes('class="govuk-radios__input"') &&
      html.includes(
        `aria-controls="${permittedConditionalRadio.ariaControls}"`
      ) &&
      target.length === 1 &&
      target[0] === permittedConditionalRadio.target
  )

export const axeViolations = async (
  page,
  permittedConditionalRadio = undefined
) => {
  await page.waitForLoadState('domcontentloaded')
  await page.locator('h1').waitFor({ state: 'visible' })

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()

  return {
    all: results.violations,
    seriousOrCritical: results.violations.filter(
      (violation) =>
        ['serious', 'critical'].includes(violation.impact) &&
        !isPermittedConditionalRadioViolation(
          violation,
          permittedConditionalRadio
        )
    )
  }
}
