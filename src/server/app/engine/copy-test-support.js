import { expect, it } from 'vitest'
import { isCopyLeaf, leaves } from '../shared/copy-leaves.js'

/** The text a copy leaf gives: the string itself, or what the copy function
 * returns for the sample arguments. */
export const sampleText = (value, sampleArguments) =>
  typeof value === 'function' ? value(...sampleArguments) : value

export const expectEveryLeafToBeCopy = (
  locale,
  bundle,
  sampleArguments = []
) => {
  for (const { path, value } of leaves(bundle)) {
    expect(isCopyLeaf(value), `${locale}: ${path} must be copy`).toBe(true)
    const text = sampleText(value, sampleArguments)
    expect(typeof text, `${locale}: ${path} must resolve to a string`).toBe(
      'string'
    )
    expect(
      text.trim().length,
      `${locale}: ${path} must render text`
    ).toBeGreaterThan(0)
  }
}

export const itHoldsCopyAtEveryLeaf = (en, cy, sampleArguments = []) =>
  it.each([
    ['en', en],
    ['cy', cy]
  ])(
    'Should hold a non-empty string or copy function at every %s leaf',
    (locale, bundle) => expectEveryLeafToBeCopy(locale, bundle, sampleArguments)
  )
