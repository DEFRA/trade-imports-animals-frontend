import { describe, expect, it } from 'vitest'

import { hasErrors, pageValidation } from './page-validation.js'
import { compose, maxText, oneOf, requiredText } from './validators.js'

const NAME_REQUIRED_SUBMIT = 'Enter a name'
const NAME_REQUIRED_STORED = 'The saved name is no longer valid'
const NOTE_MAX_MESSAGE = 'Note must be 3 characters or less'
const CODE_DOMAIN = ['FR-123']

describe('#pageValidation — one schema, two entry points', () => {
  const validation = pageValidation({
    fields: () =>
      compose(
        requiredText('name', NAME_REQUIRED_SUBMIT),
        maxText('note', 3, NOTE_MAX_MESSAGE)
      ),
    fromPayload: (payload) => ({
      name: payload.name ?? '',
      note: payload.note ?? ''
    }),
    fromAnswers: (answers) => ({
      name: answers.name ?? '',
      note: answers.note ?? ''
    })
  })

  it('Should enforce the same rules on a submitted form and on a stored reading', async () => {
    const submitted = await validation.onSubmit({ note: 'too long' })
    const stored = await validation.onStored({ note: 'too long' })

    expect(submitted.errors).toEqual({
      name: NAME_REQUIRED_SUBMIT,
      note: NOTE_MAX_MESSAGE
    })
    expect(stored.errors).toEqual({
      name: NAME_REQUIRED_SUBMIT,
      note: NOTE_MAX_MESSAGE
    })
  })
})

describe('#pageValidation — onSubmit shape', () => {
  const validation = pageValidation({
    fields: () => compose(requiredText('name', NAME_REQUIRED_SUBMIT)),
    fromPayload: (payload) => ({ name: (payload.name ?? '').trim() }),
    fromAnswers: (answers) => ({ name: answers.name ?? '' }),
    toAnswers: (values) => ({ storedName: values.name })
  })

  it('Should return the values the page renders, the answers toAnswers maps them to, and empty errors for a clean form', async () => {
    const { values, answers, errors } = await validation.onSubmit({
      name: '  Alex  '
    })

    expect(values).toEqual({ name: 'Alex' })
    expect(answers).toEqual({ storedName: 'Alex' })
    expect(errors).toEqual({})
  })

  it('Should key a blocked submission by the field name', async () => {
    const { errors } = await validation.onSubmit({ name: '' })

    expect(errors).toEqual({ name: NAME_REQUIRED_SUBMIT })
  })
})

describe('#pageValidation — onStored reads through fromAnswers', () => {
  const validation = pageValidation({
    fields: () => compose(requiredText('name', NAME_REQUIRED_SUBMIT)),
    fromPayload: (payload) => ({ name: payload.name ?? '' }),
    fromAnswers: (answers) => ({ name: answers.storedName ?? '' })
  })

  it('Should map stored answers through fromAnswers before measuring them, and key errors by the page field', async () => {
    const { values, errors } = await validation.onStored({ storedName: '' })

    expect(values).toEqual({ name: '' })
    expect(errors).toEqual({ name: NAME_REQUIRED_SUBMIT })
  })
})

describe('#pageValidation — context.stored lets a rule change its message without changing the rule', () => {
  const validation = pageValidation({
    fields: (_values, { stored } = {}) =>
      compose(
        requiredText(
          'name',
          stored ? NAME_REQUIRED_STORED : NAME_REQUIRED_SUBMIT
        )
      ),
    fromPayload: (payload) => ({ name: payload.name ?? '' }),
    fromAnswers: (answers) => ({ name: answers.name ?? '' })
  })

  it('Should pass stored: false on a submission', async () => {
    const { errors } = await validation.onSubmit({})

    expect(errors).toEqual({ name: NAME_REQUIRED_SUBMIT })
  })

  it('Should pass stored: true on a stored reading', async () => {
    const { errors } = await validation.onStored({})

    expect(errors).toEqual({ name: NAME_REQUIRED_STORED })
  })
})

describe('#pageValidation — normalise measures a different value than the page renders', () => {
  const validation = pageValidation({
    fields: () => compose(oneOf('code', CODE_DOMAIN)),
    normalise: (values) => ({ ...values, code: values.code.toUpperCase() }),
    fromPayload: (payload) => ({ code: payload.code ?? '' }),
    fromAnswers: (answers) => ({ code: answers.code ?? '' })
  })

  it('Should hold the normalised value to the rules while leaving the rendered value exactly as typed', async () => {
    const { values, errors } = await validation.onSubmit({ code: 'fr-123' })

    expect(errors).toEqual({})
    expect(values.code).toBe('fr-123')
  })
})

describe('#pageValidation — checks merge under schema errors', () => {
  const OTHER_MESSAGE = 'Something else is wrong'
  const validation = pageValidation({
    fields: () => compose(requiredText('name', NAME_REQUIRED_SUBMIT)),
    checks: (values) =>
      values.name === ''
        ? { name: NAME_REQUIRED_STORED, other: OTHER_MESSAGE }
        : {},
    fromPayload: (payload) => ({ name: payload.name ?? '' }),
    fromAnswers: (answers) => ({ name: answers.name ?? '' })
  })

  it("Should keep the schema's message on a field the schema already failed", async () => {
    const { errors } = await validation.onSubmit({ name: '' })

    expect(errors.name).toBe(NAME_REQUIRED_SUBMIT)
  })

  it('Should surface a checks-only error on a field the schema did not touch', async () => {
    const { errors } = await validation.onSubmit({ name: '' })

    expect(errors.other).toBe(OTHER_MESSAGE)
  })
})

describe('#pageValidation — blanks', () => {
  const validation = pageValidation({
    fields: () => compose(oneOf('a', ['keep'])),
    fromPayload: (payload) => ({ a: payload.a ?? '', b: payload.b ?? '' }),
    fromAnswers: (answers) => ({ a: answers.a ?? '', b: answers.b ?? '' }),
    blanks: (field) => (field === 'a' ? ['a', 'b'] : [field])
  })

  it("Should clear the named fields in onStored's values when the field is rejected", async () => {
    const { values } = await validation.onStored({ a: 'stale', b: 'stale' })

    expect(values).toEqual({ a: '', b: '' })
  })

  it("Should leave onSubmit's values untouched even though the same field fails", async () => {
    const { values } = await validation.onSubmit({ a: 'stale', b: 'stale' })

    expect(values).toEqual({ a: 'stale', b: 'stale' })
  })
})

describe('#hasErrors', () => {
  it('Should be false for a clean read', () => {
    expect(hasErrors({})).toBe(false)
  })

  it('Should be true when anything is wrong', () => {
    expect(hasErrors({ name: 'Enter a name' })).toBe(true)
  })
})

describe('#pageValidation — no toAnswers commits values unchanged', () => {
  const validation = pageValidation({
    fields: () => compose(requiredText('name', NAME_REQUIRED_SUBMIT)),
    fromPayload: (payload) => ({ name: payload.name ?? '' }),
    fromAnswers: (answers) => ({ name: answers.name ?? '' })
  })

  it('Should commit the values as-is when the page gives no toAnswers', async () => {
    const { values, answers } = await validation.onSubmit({ name: 'Alex' })

    expect(answers).toEqual(values)
  })
})
