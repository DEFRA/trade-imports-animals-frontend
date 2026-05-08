import { validatePartialDate } from './partial-date-validator.js'

describe('#validatePartialDate', () => {
  test('Should return null when date is completely absent and no file is attached (empty strings)', () => {
    const error = validatePartialDate({
      'issueDate-day': '',
      'issueDate-month': '',
      'issueDate-year': ''
    })
    expect(error).toBeNull()
  })

  test('Should return null when date is completely absent and no file is attached (undefined)', () => {
    const error = validatePartialDate({})
    expect(error).toBeNull()
  })

  test('Should return error for all three fields when date is completely absent (empty strings) and a file is attached', () => {
    const error = validatePartialDate({
      'issueDate-day': '',
      'issueDate-month': '',
      'issueDate-year': '',
      file: { payload: Buffer.from('data') }
    })
    expect(error).not.toBeNull()
    expect(error.details).toHaveLength(3)
    expect(error.details[0].message).toBe('Enter a date of issue')
    expect(error.details[0].path).toEqual(['issueDate-day'])
    expect(error.details[1].path).toEqual(['issueDate-month'])
    expect(error.details[2].path).toEqual(['issueDate-year'])
  })

  test('Should return error for all three fields when date is completely absent (undefined) and a file is attached', () => {
    const error = validatePartialDate({
      file: { payload: Buffer.from('data') }
    })
    expect(error).not.toBeNull()
    expect(error.details).toHaveLength(3)
    expect(error.details[0].message).toBe('Enter a date of issue')
  })

  test('Should return error only for missing fields when only day is provided', () => {
    const error = validatePartialDate({ 'issueDate-day': 15 })
    expect(error).not.toBeNull()
    expect(error.details).toHaveLength(2)
    expect(error.details[0].message).toBe('Date of issue must include a month')
    expect(error.details[0].path).toEqual(['issueDate-month'])
    expect(error.details[1].message).toBe('Date of issue must include a year')
    expect(error.details[1].path).toEqual(['issueDate-year'])
  })

  test('Should return error only for missing fields when only month is provided', () => {
    const error = validatePartialDate({ 'issueDate-month': 6 })
    expect(error).not.toBeNull()
    expect(error.details).toHaveLength(2)
    expect(error.details[0].message).toBe('Date of issue must include a day')
    expect(error.details[0].path).toEqual(['issueDate-day'])
    expect(error.details[1].message).toBe('Date of issue must include a year')
    expect(error.details[1].path).toEqual(['issueDate-year'])
  })

  test('Should return error only for year when day and month are provided', () => {
    const error = validatePartialDate({
      'issueDate-day': 15,
      'issueDate-month': 6
    })
    expect(error).not.toBeNull()
    expect(error.details).toHaveLength(1)
    expect(error.details[0].message).toBe('Date of issue must include a year')
    expect(error.details[0].path).toEqual(['issueDate-year'])
  })

  test('Should return error only for day when month and year are provided', () => {
    const error = validatePartialDate({
      'issueDate-month': 6,
      'issueDate-year': 2024
    })
    expect(error).not.toBeNull()
    expect(error.details).toHaveLength(1)
    expect(error.details[0].message).toBe('Date of issue must include a day')
    expect(error.details[0].path).toEqual(['issueDate-day'])
  })

  test('Should return null when all three date parts are provided', () => {
    const error = validatePartialDate({
      'issueDate-day': 15,
      'issueDate-month': 6,
      'issueDate-year': 2024
    })
    expect(error).toBeNull()
  })

  test('Should return error for all three fields when date is not a real calendar date (31 Feb)', () => {
    const error = validatePartialDate({
      'issueDate-day': '31',
      'issueDate-month': '2',
      'issueDate-year': '2024'
    })
    expect(error).not.toBeNull()
    expect(error.details).toHaveLength(3)
    expect(error.details[0].message).toBe('Enter a real date of issue')
    expect(error.details[0].path).toEqual(['issueDate-day'])
    expect(error.details[1].message).toBe('Enter a real date of issue')
    expect(error.details[1].path).toEqual(['issueDate-month'])
    expect(error.details[2].message).toBe('Enter a real date of issue')
    expect(error.details[2].path).toEqual(['issueDate-year'])
  })

  test('Should return error for all three fields when day is out of range (32nd of a month)', () => {
    const error = validatePartialDate({
      'issueDate-day': '32',
      'issueDate-month': '1',
      'issueDate-year': '2024'
    })
    expect(error).not.toBeNull()
    expect(error.details).toHaveLength(3)
    expect(error.details[0].message).toBe('Enter a real date of issue')
    expect(error.details[0].path).toEqual(['issueDate-day'])
    expect(error.details[1].message).toBe('Enter a real date of issue')
    expect(error.details[1].path).toEqual(['issueDate-month'])
    expect(error.details[2].message).toBe('Enter a real date of issue')
    expect(error.details[2].path).toEqual(['issueDate-year'])
  })

  test('Should return null for a valid calendar date (29 Feb in a leap year)', () => {
    const error = validatePartialDate({
      'issueDate-day': '29',
      'issueDate-month': '2',
      'issueDate-year': '2024'
    })
    expect(error).toBeNull()
  })
})
