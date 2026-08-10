import { expect } from '@playwright/test'

const ARTEFACT_DIR =
  process.env.LAYOUT_ARTEFACT_DIR ?? 'test-results/layout-artefacts'

const overflowReport = () => {
  const root = document.documentElement
  const overflow = root.scrollWidth - root.clientWidth
  const offenders = [...document.querySelectorAll('body *')]
    .map((element) => ({
      selector: `${element.tagName.toLowerCase()}.${element.className || '(no class)'}`,
      right: Math.round(element.getBoundingClientRect().right)
    }))
    .filter(({ right }) => right > root.clientWidth)
    .slice(0, 10)
  return { overflow, offenders }
}

export const measureHorizontalOverflow = (page) => page.evaluate(overflowReport)

export const expectNoHorizontalOverflow = async (page) => {
  const { overflow, offenders } = await measureHorizontalOverflow(page)

  expect(
    overflow,
    `Page overflows horizontally. Elements past the client width:\n${JSON.stringify(offenders, null, 2)}`
  ).toBeLessThanOrEqual(0)
}

export const logLayoutMetric = (label, value) => {
  process.stdout.write(`[EUDPA-322 metric] ${label}: ${value}\n`)
}

export const captureAc6Screenshot = (page, name) =>
  page.screenshot({ path: `${ARTEFACT_DIR}/${name}.png`, fullPage: true })
