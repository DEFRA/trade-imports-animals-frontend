import { SET_ID } from '../../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  driveHandler,
  expectNoRefusalLogged,
  getHandlerOf,
  postHandlerOf,
  useReferenceDataServing,
  useStubbedJourney
} from '../../../../../../engine/test-support.js'
import { dispatchPages } from '../index.js'
import * as countries from '../../../../../../services/countries/index.js'

import * as origin from './controller.js'
import { copy } from './copy/copy.en.js'
import { REGION_CODE_SUFFIX_MAX_LENGTH } from './validate.js'

const post = postHandlerOf(origin)
const get = getHandlerOf(origin)

const COUNTRY_CODE_OUTSIDE_THE_LIST = 'ZZ'
const COUNTRY_FROM_LIST_MESSAGE = 'Select a country from the list'
const REGION_CODE_REQUIRED_MESSAGE = 'Enter the region of origin code'
const REGION_CODE_MAX_LENGTH_MESSAGE =
  'Region of origin code must be 5 characters or less'
const INTERNAL_REFERENCE_MAX_LENGTH = 58
const INTERNAL_REFERENCE_MAX_LENGTH_MESSAGE =
  'Internal reference must be 58 characters or less'

useStubbedJourney(SET_ID, dispatchPages)

describe('POST /origin — invalid payload', () => {
  const cases = [
    {
      name: 'countryOfOrigin outside the countries list',
      payload: {
        countryOfOrigin: 'XX',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: 'Imports456GB'
      },
      field: 'countryOfOrigin',
      message: COUNTRY_FROM_LIST_MESSAGE
    },
    {
      name: 'an internal reference over the length limit',
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: 'A'.repeat(INTERNAL_REFERENCE_MAX_LENGTH + 1)
      },
      field: 'internalReferenceNumber',
      message: INTERNAL_REFERENCE_MAX_LENGTH_MESSAGE
    }
  ]

  it.each(cases)(
    'Should re-render $name with its message and commit nothing',
    async ({ payload, field, message }) => {
      const result = await driveHandler(post, { payload })
      expect(result.response.statusCode).toBe(400)
      expect(result.view.context.errors[field]).toBe(message)
      expect(result.after).toEqual(result.before)
      expectNoRefusalLogged(result.logger)
    }
  )
})

describe('POST /origin — an unanswered country still saves', () => {
  it('Should keep the rest of the page and move on when no country is chosen', async () => {
    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: '',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: 'Imports456GB'
      }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.countryOfOrigin).toBe('')
    expect(result.after.internalReferenceNumber).toBe('Imports456GB')
    expect(result.after.regionOfOriginCodeRequirement).toBe('no')
  })

  it('Should save a page answered by nothing but the internal reference', async () => {
    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: '',
        regionOfOriginCodeRequirement: '',
        internalReferenceNumber: 'Imports456GB'
      }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.internalReferenceNumber).toBe('Imports456GB')
    expect(result.after.countryOfOrigin).toBe('')
    expect(result.after.regionOfOriginCodeRequirement).toBe('')
  })

  it('Should save no region code while no country gives it its prefix', async () => {
    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: '',
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCodeSuffix: '75',
        internalReferenceNumber: ''
      }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.regionOfOriginCodeRequirement).toBe('yes')
    expect(result.after.regionOfOriginCode).toBe('')
  })

  it('Should keep the typed code on the page when the save is refused for another answer', async () => {
    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: '',
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCodeSuffix: '75',
        internalReferenceNumber: 'A'.repeat(INTERNAL_REFERENCE_MAX_LENGTH + 1)
      }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.values.regionOfOriginCodeSuffix).toBe('75')
    expect(result.view.context.regionCodePrefix).toBe('')
    expect(result.after).toEqual(result.before)
  })
})

describe('POST /origin — valid internal reference', () => {
  it('Should accept and save an internal reference containing an underscore', async () => {
    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: 'Imports456_GB'
      }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.internalReferenceNumber).toBe('Imports456_GB')
  })

  const punctuatedReferences = [
    'ACME-2026/01',
    'Acme ref 12',
    'ACME.2026.01',
    'ACME-2026/01 (batch 2)'
  ]

  it.each(punctuatedReferences)(
    'Should save the internal reference %s with its punctuation unchanged',
    async (internalReferenceNumber) => {
      const result = await driveHandler(post, {
        payload: {
          countryOfOrigin: 'FR',
          regionOfOriginCodeRequirement: 'no',
          internalReferenceNumber
        }
      })

      expect(result.view).toBeUndefined()
      expect(result.after.internalReferenceNumber).toBe(internalReferenceNumber)
    }
  )

  it('Should accept an internal reference at the length limit', async () => {
    const atLimit = 'A'.repeat(INTERNAL_REFERENCE_MAX_LENGTH)
    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: atLimit
      }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.internalReferenceNumber).toBe(atLimit)
  })
})

describe('POST /origin — region of origin code prefix and suffix', () => {
  const postSuffix = (regionOfOriginCodeSuffix) =>
    driveHandler(post, {
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCodeSuffix,
        internalReferenceNumber: ''
      }
    })

  it('Should store the country prefix joined to the typed part in upper case', async () => {
    const result = await postSuffix('75')

    expect(result.view).toBeUndefined()
    expect(result.after.regionOfOriginCode).toBe('FR-75')
  })

  it('Should accept a region part longer than two characters', async () => {
    const result = await postSuffix('dub')

    expect(result.view).toBeUndefined()
    expect(result.after.regionOfOriginCode).toBe('FR-DUB')
  })

  it('Should not double the prefix when the typed part already carries it', async () => {
    const result = await postSuffix('fr-75')

    expect(result.view).toBeUndefined()
    expect(result.after.regionOfOriginCode).toBe('FR-75')
  })

  it('Should store a code typed with the country code but no hyphen as typed, after the joined prefix', async () => {
    const result = await postSuffix('fr75')

    expect(result.view).toBeUndefined()
    expect(result.after.regionOfOriginCode).toBe('FR-FR75')
  })

  it('Should store a typed prefix with a rest of exactly 5 characters as the joined code', async () => {
    const result = await postSuffix('fr-abcde')

    expect(result.view).toBeUndefined()
    expect(result.after.regionOfOriginCode).toBe('FR-ABCDE')
  })

  it('Should refuse a typed prefix with a rest of 6 characters and commit nothing', async () => {
    const result = await postSuffix('fr-abcdef')

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.regionOfOriginCodeSuffix).toBe(
      REGION_CODE_MAX_LENGTH_MESSAGE
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should hold the user on the page when the typed part is blank', async () => {
    const result = await postSuffix('   ')

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.regionOfOriginCodeSuffix).toBe(
      REGION_CODE_REQUIRED_MESSAGE
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should hold the user on the page when the typed part is only the prefix', async () => {
    const result = await postSuffix('fr-')

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.regionOfOriginCodeSuffix).toBe(
      REGION_CODE_REQUIRED_MESSAGE
    )
    expect(result.view.context.values.regionOfOriginCodeSuffix).toBe('fr-')
    expect(result.after).toEqual(result.before)
  })

  it('Should hold the user on the page when the box was never submitted', async () => {
    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'yes',
        internalReferenceNumber: ''
      }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.regionOfOriginCodeSuffix).toBe(
      REGION_CODE_REQUIRED_MESSAGE
    )
    expect(result.after).toEqual(result.before)
  })

  const changeStoredCodeToNo = () =>
    driveHandler(post, {
      seed: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCode: 'FR-75'
      },
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        regionOfOriginCodeSuffix: '75',
        internalReferenceNumber: ''
      }
    })

  it('Should clear the stored code when the answer changes from Yes to No', async () => {
    const changed = await changeStoredCodeToNo()

    expect(changed.view).toBeUndefined()
    expect(changed.before.regionOfOriginCode).toBe('FR-75')
    expect(changed.after.regionOfOriginCodeRequirement).toBe('no')
    expect(changed.after.regionOfOriginCode).toBe('')
  })

  it('Should show an empty region code box on return after the answer was changed to No', async () => {
    const { after } = await changeStoredCodeToNo()

    const reopened = await driveHandler(get, { seed: after })
    expect(reopened.view.context.values.regionOfOriginCodeSuffix).toBe('')
  })

  it('Should let a blank box through when the answer is No', async () => {
    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        regionOfOriginCodeSuffix: '',
        internalReferenceNumber: ''
      }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.regionOfOriginCode).toBe('')
  })

  it('Should reject a typed part over 5 characters even when the answer is No', async () => {
    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        regionOfOriginCodeSuffix: 'ABCDEF',
        internalReferenceNumber: ''
      }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.regionOfOriginCodeSuffix).toBe(
      REGION_CODE_MAX_LENGTH_MESSAGE
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should reject a typed part over 5 characters and commit nothing', async () => {
    const result = await postSuffix('ABCDEF')

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.regionOfOriginCodeSuffix).toBe(
      REGION_CODE_MAX_LENGTH_MESSAGE
    )
    expect(result.view.context.regionCodePrefix).toBe('FR')
    expect(result.view.context.values.regionOfOriginCodeSuffix).toBe('ABCDEF')
    expect(result.after).toEqual(result.before)
  })
})

describe('POST /origin — Save and return to overview', () => {
  const postRegion = (regionOfOriginCodeSuffix, extra = {}) =>
    driveHandler(post, {
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCodeSuffix,
        internalReferenceNumber: '',
        ...extra
      }
    })

  it('Should refuse "Yes" with the region code left blank, keep "Yes" chosen and save nothing', async () => {
    const result = await postRegion('', { exit: 'hub' })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.regionOfOriginCodeSuffix).toBe(
      REGION_CODE_REQUIRED_MESSAGE
    )
    expect(result.view.context.values.regionOfOriginCodeRequirement).toBe('yes')
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a region code over 5 characters and save nothing', async () => {
    const result = await postRegion('ABCDEF', { exit: 'hub' })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.regionOfOriginCodeSuffix).toBe(
      REGION_CODE_MAX_LENGTH_MESSAGE
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should keep refusing a blank region code on Save and continue', async () => {
    const result = await postRegion('')

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.regionOfOriginCodeSuffix).toBe(
      REGION_CODE_REQUIRED_MESSAGE
    )
    expect(result.after).toEqual(result.before)
  })
})

describe('GET /origin — region of origin code splits back into its two parts', () => {
  it('Should render the country as the prefix and only the rest in the box', async () => {
    const result = await driveHandler(get, {
      seed: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCode: 'FR-75'
      }
    })

    expect(result.view.context.regionCodePrefix).toBe('FR')
    expect(result.view.context.values.regionOfOriginCodeSuffix).toBe('75')
  })

  it('Should give an empty prefix value and an empty box before a country has been chosen', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.regionCodePrefix).toBe('')
    expect(result.view.context.values.regionOfOriginCodeSuffix).toBe('')
  })
})

describe('GET /origin — server-rendered select data (no-JS path)', () => {
  it('Should supply the select text and full country list to the select', async () => {
    const result = await driveHandler(get)
    const items = result.view.context.countryItems
    expect(items[0]).toEqual({ value: '', text: 'Select a country' })
    expect(items).toContainEqual({ value: 'FR', text: 'France' })
  })

  it('Should name a subdivision with its parent country in the select', async () => {
    const result = await driveHandler(get)
    expect(result.view.context.countryItems).toContainEqual({
      value: 'ES-CN',
      text: 'Canary Islands (Spain)'
    })
  })

  it("Should sort the select's countries and subdivisions by the label shown", async () => {
    const result = await driveHandler(get)
    const labels = result.view.context.countryItems
      .slice(1)
      .map(({ text }) => text)
    expect(labels).toEqual(
      [...labels].sort((left, right) => left.localeCompare(right))
    )
  })

  it('Should supply the feature copy module and the shared chrome copy', async () => {
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(copy.title)
    expect(result.view.context.sharedCopy.saveActions.saveAndContinue).toBe(
      'Save and continue'
    )
  })

  it('Should supply the region code suffix maximum length to the view', async () => {
    const result = await driveHandler(get)
    expect(result.view.context.regionCodeSuffixMaxLength).toBe(
      REGION_CODE_SUFFIX_MAX_LENGTH
    )
  })

  it('Should offer no unselectable filler rows for the type-ahead to search', async () => {
    const result = await driveHandler(get)
    const items = result.view.context.countryItems
    expect(items.filter((item) => item.disabled)).toEqual([])
    expect(items.filter((item) => item.value === '')).toHaveLength(1)
  })
})

describe('GET /origin — region code prefix for each offered country', () => {
  it("Should map exactly the offered countries to their region code prefixes, a subdivision to its parent's", async () => {
    const result = await driveHandler(get)
    const { countryItems, regionCodePrefixesByCountry } = result.view.context
    const offeredValues = countryItems.slice(1).map(({ value }) => value)
    expect(Object.keys(regionCodePrefixesByCountry)).toEqual(offeredValues)
    expect(regionCodePrefixesByCountry.FR).toBe('FR')
    expect(regionCodePrefixesByCountry['ES-CN']).toBe('ES')
  })
})

describe('POST /origin — empty country overwrites a stored answer', () => {
  it('Should replace a previously stored country with an empty string when the select text is submitted', async () => {
    const result = await driveHandler(post, {
      seed: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: 'existing-ref'
      },
      payload: {
        countryOfOrigin: '',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: 'existing-ref'
      }
    })

    expect(result.view).toBeUndefined()
    expect(result.before.countryOfOrigin).toBe('FR')
    expect(result.after.countryOfOrigin).toBe('')
  })
})

describe('GET /origin — a stored country the reader no longer offers', () => {
  it('Should blank the country in values so the select renders unselected', async () => {
    const result = await driveHandler(get, {
      seed: {
        countryOfOrigin: COUNTRY_CODE_OUTSIDE_THE_LIST,
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: ''
      }
    })

    expect(result.view.context.values.countryOfOrigin).toBe('')
    expect(
      result.view.context.countryItems.find(
        (item) => item.value === COUNTRY_CODE_OUTSIDE_THE_LIST
      )
    ).toBeUndefined()
  })

  it('Should surface a country-no-longer-available error on the country field', async () => {
    const result = await driveHandler(get, {
      seed: {
        countryOfOrigin: COUNTRY_CODE_OUTSIDE_THE_LIST,
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: ''
      }
    })

    expect(result.view.context.errors.countryOfOrigin).toBe(
      'The saved country is no longer available. Select a country from the list.'
    )
  })

  it('Should blank the region-code suffix input so the whole stored code does not cascade into it', async () => {
    const result = await driveHandler(get, {
      seed: {
        countryOfOrigin: COUNTRY_CODE_OUTSIDE_THE_LIST,
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCode: 'AT-123'
      }
    })

    expect(result.view.context.regionCodePrefix).toBe('')
    expect(result.view.context.values.regionOfOriginCodeSuffix).toBe('')
  })

  it('Should leave the stored answer intact — GET only reshapes what the page renders', async () => {
    const result = await driveHandler(get, {
      seed: {
        countryOfOrigin: COUNTRY_CODE_OUTSIDE_THE_LIST,
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCode: 'AT-123'
      }
    })

    expect(result.before.countryOfOrigin).toBe(COUNTRY_CODE_OUTSIDE_THE_LIST)
    expect(result.after.countryOfOrigin).toBe(COUNTRY_CODE_OUTSIDE_THE_LIST)
    expect(result.after.regionOfOriginCode).toBe('AT-123')
  })
})

describe('POST /origin — a stored region code cascades to a length error under a stale country', () => {
  it('Should reject the payload with a max-length error on the region code', async () => {
    const result = await driveHandler(post, {
      seed: {
        countryOfOrigin: COUNTRY_CODE_OUTSIDE_THE_LIST,
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCode: 'AT-123'
      },
      payload: {
        countryOfOrigin: '',
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCodeSuffix: 'AT-123',
        internalReferenceNumber: ''
      }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.regionOfOriginCodeSuffix).toBe(
      REGION_CODE_MAX_LENGTH_MESSAGE
    )
    expect(result.view.context.errors.countryOfOrigin).toBeUndefined()
  })
})

describe('POST /origin — country subdivisions', () => {
  it('Should store the subdivision code when a subdivision is picked', async () => {
    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: 'ES-CN',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: ''
      }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.countryOfOrigin).toBe('ES-CN')
    expect(result.after.countryOfOriginSubdivisionCode).toBe('ES-CN')
  })

  it('Should clear the stored subdivision when switched to a whole country', async () => {
    await driveHandler(post, {
      payload: {
        countryOfOrigin: 'ES-CN',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: ''
      }
    })

    const result = await driveHandler(post, {
      payload: {
        countryOfOrigin: 'ES',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: ''
      }
    })

    expect(result.view).toBeUndefined()
    expect(result.after.countryOfOrigin).toBe('ES')
    expect(result.after.countryOfOriginSubdivisionCode).toBe('')
  })
})

describe('GET /origin — country subdivisions', () => {
  it('Should render a stored subdivision in the country field', async () => {
    const result = await driveHandler(get, {
      seed: {
        countryOfOrigin: 'ES-CN',
        countryOfOriginSubdivisionCode: 'ES-CN',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: ''
      }
    })

    expect(result.view.context.values.countryOfOrigin).toBe('ES-CN')
  })

  it("Should show the parent country's code as the region code prefix for a stored subdivision", async () => {
    const result = await driveHandler(get, {
      seed: {
        countryOfOrigin: 'ES-CN',
        countryOfOriginSubdivisionCode: 'ES-CN',
        regionOfOriginCodeRequirement: 'yes',
        regionOfOriginCode: 'ES-12'
      }
    })

    expect(result.view.context.regionCodePrefix).toBe('ES')
    expect(result.view.context.values.regionOfOriginCodeSuffix).toBe('12')
  })
})

describe('POST /origin — country membership follows the primed list', () => {
  const serveReferenceData = useReferenceDataServing()

  it('Should validate against the list as primed at POST time, not as imported', async () => {
    serveReferenceData([{ code: 'ZZ', name: 'Zedland' }])
    await countries.ensureLoaded()

    const accepted = await driveHandler(post, {
      payload: {
        countryOfOrigin: 'ZZ',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: ''
      }
    })
    expect(accepted.view).toBeUndefined()
    expect(accepted.after.countryOfOrigin).toBe('ZZ')

    const rejected = await driveHandler(post, {
      payload: {
        countryOfOrigin: 'FR',
        regionOfOriginCodeRequirement: 'no',
        internalReferenceNumber: ''
      }
    })
    expect(rejected.view.context.errors.countryOfOrigin).toBe(
      COUNTRY_FROM_LIST_MESSAGE
    )
  })
})
