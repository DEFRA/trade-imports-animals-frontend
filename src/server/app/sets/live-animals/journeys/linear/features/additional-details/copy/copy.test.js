import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'
import { leaves } from '../../../../../../../shared/copy-leaves.js'

import {
  driveHandler,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { dispatchPages } from '../../index.js'

import * as additionalDetails from '../controller.js'
import { copy } from './copy.en.js'
import { copy as copyCy } from './copy.cy.js'

describe('additional-details copy module', () => {
  it('Should have a non-empty string at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      expect(typeof value, `${path} must be a string`).toBe('string')
      expect(value.trim().length, `${path} must not be empty`).toBeGreaterThan(
        0
      )
    }
  })

  it('Should name the page without the word animal', () => {
    expect(copy.title).toBe('Additional details')
    expect(copyCy.title).toBe('Manylion ychwanegol')
  })

  it('Should name the ITAHC as the source of the certification purpose, in English and Welsh', () => {
    expect(copy.certified.hint).toBe(
      'You can find this information on the ITAHC.'
    )
    expect(copyCy.certified.hint).toBe(
      "Gallwch ddod o hyd i'r wybodaeth hon ar yr ITAHC."
    )
  })
})

describe('GET additional-details — copy reaches the view', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should supply the feature copy module to the view', async () => {
    const get = additionalDetails.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const result = await driveHandler(get)
    expect(result.view.context.copy).toBe(copy)
    expect(result.view.context.pageTitle).toBe(copy.title)
  })

  it('Should label the unweaned options from the copy module', async () => {
    const get = additionalDetails.routes.find(
      (route) => route.method === 'GET'
    ).handler
    const result = await driveHandler(get)
    expect(
      result.view.context.unweanedOptions.map((option) => option.text)
    ).toEqual([copy.unweaned.yes, copy.unweaned.no])
  })
})
