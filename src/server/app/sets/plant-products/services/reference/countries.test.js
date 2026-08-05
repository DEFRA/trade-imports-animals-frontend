import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Linter } from 'eslint'
import { describe, expect, it } from 'vitest'

import {
  COUNTRIES,
  REGION_FILTER_CODES,
  UK_SUBDIVISION_CODES,
  countryLabel,
  countryOptions,
  ukSubdivisionOptions
} from './countries.js'

const featureRoot = fileURLToPath(
  new URL('../../journeys/linear/features/', import.meta.url)
)
const countriesModulePattern = /\/services\/reference\/countries\.js$/u

const controllerFilesBelow = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return controllerFilesBelow(path)
    }
    return entry.isFile() &&
      (entry.name === 'controller.js' || entry.name.endsWith('.controller.js'))
      ? [path]
      : []
  })

const inspectCountryHelpers = (source) => {
  const imports = []
  const calls = new Set()
  const inspectionRule = {
    create: () => ({
      ImportDeclaration(node) {
        if (!countriesModulePattern.test(node.source.value)) {
          return
        }

        for (const specifier of node.specifiers) {
          if (specifier.type !== 'ImportSpecifier') {
            continue
          }
          imports.push({
            imported: specifier.imported.name,
            local: specifier.local.name
          })
        }
      },
      CallExpression(node) {
        if (node.callee.type === 'Identifier') {
          calls.add(node.callee.name)
        }
      }
    })
  }
  const messages = new Linter({ configType: 'flat' }).verify(source, [
    {
      languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      plugins: { countryPin: { rules: { inspect: inspectionRule } } },
      rules: { 'countryPin/inspect': 'error' }
    }
  ])

  if (messages.length > 0) {
    throw new Error(messages.map(({ message }) => message).join('\n'))
  }

  return { calls, imports }
}

describe('plant-products country reference data', () => {
  it('contains 253 valid entries with unique codes', () => {
    expect(COUNTRIES).toHaveLength(253)
    expect(new Set(COUNTRIES.map(({ code }) => code))).toHaveProperty(
      'size',
      253
    )

    for (const { code, name } of COUNTRIES) {
      expect(code).toEqual(expect.any(String))
      expect(code.length).toBeGreaterThan(0)
      expect(name).toEqual(expect.any(String))
      expect(name.length).toBeGreaterThan(0)
    }
  })

  it('does not contain a selectable GB entry', () => {
    expect(COUNTRIES.some(({ code }) => code === 'GB')).toBe(false)
  })

  it('uses the rendered Republic of Ireland label', () => {
    expect(countryLabel('IE')).toBe('Republic of Ireland')
  })

  it.each([
    ['AX', 'Aland Islands'],
    ['AG', 'Antigua and Barbuda'],
    ['BV', 'Bouvet Island'],
    ['ES-CN', 'Canary Islands'],
    ['VA', 'Holy See'],
    ['TR', 'Turkey'],
    ['US', 'United States of America'],
    ['VN', 'Viet Nam'],
    ['VI', 'Virgin Islands of the United States'],
    ['AT', 'Austria'],
    ['BZ', 'Belize']
  ])('labels %s as %s', (code, name) => {
    expect(countryLabel(code)).toBe(name)
  })

  it('returns undefined for an unknown code', () => {
    expect(countryLabel('UNKNOWN')).toBeUndefined()
  })

  it('provides 249 flat country options in alphabetical order', () => {
    const options = countryOptions()
    const texts = options.map(({ text }) => text)

    expect(options).toHaveLength(249)
    expect(texts).toEqual(
      [...texts].sort((first, second) => first.localeCompare(second))
    )

    for (const option of options) {
      expect(option).toEqual({
        value: expect.any(String),
        text: expect.any(String)
      })
    }

    const values = options.map(({ value }) => value)
    for (const excludedCode of [
      ...UK_SUBDIVISION_CODES,
      ...REGION_FILTER_CODES
    ]) {
      expect(values).not.toContain(excludedCode)
    }
  })

  it('provides the UK subdivisions in rendered trace order', () => {
    expect(ukSubdivisionOptions()).toEqual([
      { value: 'GB-ENG', text: 'England' },
      { value: 'GB-SCT', text: 'Scotland' },
      { value: 'GB-WLS', text: 'Wales' },
      { value: 'GB-NIR', text: 'Northern Ireland' }
    ])
  })

  it('pins every plant country-options controller to both option helpers', () => {
    const consumers = controllerFilesBelow(featureRoot)
      .map((path) => ({
        path,
        ...inspectCountryHelpers(readFileSync(path, 'utf8'))
      }))
      .filter(({ imports }) =>
        imports.some(({ imported }) => imported === 'countryOptions')
      )

    expect(
      consumers.map(({ path }) => relative(featureRoot, path)).sort()
    ).toEqual([
      'dashboard/controller.js',
      'origin/country-of-origin/country-of-origin.controller.js',
      'origin/origin-of-import/origin-of-import.controller.js',
      'traders/consignor-create/consignor-create.controller.js',
      'traders/traders-addresses/traders-addresses.controller.js'
    ])

    for (const { calls, imports, path } of consumers) {
      const controller = relative(featureRoot, path)
      expect(imports, controller).toContainEqual({
        imported: 'ukSubdivisionOptions',
        local: 'ukSubdivisionOptions'
      })
      expect(calls.has('ukSubdivisionOptions'), controller).toBe(true)
    }

    // Exemption: this syntax-only pin cannot discover selectors which do not
    // import countryOptions from the countries module, resolve re-exports or
    // aliases through other modules, distinguish a shadowed call-site binding,
    // or prove that either helper call feeds rendered markup; controller tests
    // remain responsible for behaviour.
  })

  it('defines the dashboard region filter codes without display labels', () => {
    expect(REGION_FILTER_CODES).toEqual(['EEA', 'GB-CI', 'ROW'])
  })

  it('freezes the exported collections and option arrays', () => {
    expect(Object.isFrozen(COUNTRIES)).toBe(true)
    expect(Object.isFrozen(UK_SUBDIVISION_CODES)).toBe(true)
    expect(Object.isFrozen(REGION_FILTER_CODES)).toBe(true)
    expect(Object.isFrozen(countryOptions())).toBe(true)
    expect(Object.isFrozen(ukSubdivisionOptions())).toBe(true)
  })
})
