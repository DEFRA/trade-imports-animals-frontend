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

  it.each(['123456789', '12/345/6789', '12 345 6789'])(
    'Should split the whole number %s typed into the county box into its three parts',
    async (wholeNumber) => {
      const { answers, errors, values } = await validation.onSubmit({
        cphCounty: wholeNumber,
        cphParish: '',
        cphHolding: ''
      })
      expect(errors).toEqual({})
      expect(answers).toEqual({ countyParishHoldingCph: '123456789' })
      expect(values).toEqual({
        cphCounty: '12',
        cphParish: '345',
        cphHolding: '6789'
      })
    }
  )

  it('Should name each part when the county box holds fewer than nine digits and the others are empty', async () => {
    const { errors, values } = await validation.onSubmit({
      cphCounty: '1234',
      cphParish: '',
      cphHolding: ''
    })
    expect(errors).toEqual({
      cphCounty: 'County must be 2 digits',
      cphParish: 'Enter the parish',
      cphHolding: 'Enter the holding number'
    })
    expect(values).toEqual({ cphCounty: '1234', cphParish: '', cphHolding: '' })
  })

  it('Should hold the county box to its own length when the parish box is filled', async () => {
    const { errors } = await validation.onSubmit({
      cphCounty: '123456789',
      cphParish: '345',
      cphHolding: ''
    })
    expect(errors).toEqual({
      cphCounty: 'County must be 2 digits',
      cphHolding: 'Enter the holding number'
    })
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

  it('Should accept a stored value written with slashes as its nine digits', async () => {
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
