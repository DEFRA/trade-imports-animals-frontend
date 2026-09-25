import { describe, expect, it } from 'vitest'

import { validation } from './validate.js'

describe('#validation for cph-number — onSubmit', () => {
  it('Should collapse an all-blank submission to a single required message', async () => {
    const { errors } = await validation.onSubmit({
      cphCounty: '',
      cphParish: '',
      cphHolding: ''
    })
    expect(errors).toEqual({ cphCounty: 'Enter a CPH number' })
  })

  it('Should name each blank part when the submission is not all-blank', async () => {
    const { errors } = await validation.onSubmit({
      cphCounty: '12',
      cphParish: '',
      cphHolding: ''
    })
    expect(errors).toHaveProperty('cphParish')
    expect(errors).toHaveProperty('cphHolding')
    expect(errors).not.toHaveProperty('cphCounty')
  })

  it('Should join a valid nine-digit submission into countyParishHoldingCph', async () => {
    const { answers, errors } = await validation.onSubmit({
      cphCounty: '12',
      cphParish: '345',
      cphHolding: '6789'
    })
    expect(errors).toEqual({})
    expect(answers).toEqual({ countyParishHoldingCph: '123456789' })
  })
})

describe('#validation for cph-number — onStored', () => {
  it('Should return no errors when no CPH has been stored', async () => {
    const { errors } = await validation.onStored({})
    expect(errors).toEqual({})
  })

  it('Should return no errors when the stored nine digits are valid', async () => {
    const { errors } = await validation.onStored({
      countyParishHoldingCph: '123456789'
    })
    expect(errors).toEqual({})
  })

  it('Should tolerate legacy slashes in the stored value', async () => {
    const { errors } = await validation.onStored({
      countyParishHoldingCph: '12/345/6789'
    })
    expect(errors).toEqual({})
  })

  it('Should surface a stored value that is not nine digits', async () => {
    const { errors } = await validation.onStored({
      countyParishHoldingCph: '12345'
    })
    expect(errors).toEqual({
      cphCounty:
        'The saved CPH number is no longer valid. Re-enter the county, parish and holding numbers.'
    })
  })

  it('Should surface a stored value with non-digit characters', async () => {
    const { errors } = await validation.onStored({
      countyParishHoldingCph: '12ABC6789'
    })
    expect(errors).toEqual({
      cphCounty:
        'The saved CPH number is no longer valid. Re-enter the county, parish and holding numbers.'
    })
  })

  it('Should blank every part when a stored value has been rejected', async () => {
    const { values } = await validation.onStored({
      countyParishHoldingCph: '12345'
    })
    expect(values).toEqual({ cphCounty: '', cphParish: '', cphHolding: '' })
  })
})
