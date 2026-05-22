import { nl2br } from './nl2br.js'

describe('#nl2br', () => {
  describe('With null value', () => {
    test('Should return empty string', () => {
      expect(nl2br(null)).toBe('')
    })
  })

  describe('With undefined value', () => {
    test('Should return empty string', () => {
      expect(nl2br(undefined)).toBe('')
    })
  })

  describe('With empty string value', () => {
    test('Should return empty string', () => {
      expect(nl2br('')).toBe('')
    })
  })

  describe('With a plain string', () => {
    test('Should return the string unchanged as a SafeString', () => {
      expect(String(nl2br('hello world'))).toBe('hello world')
    })
  })

  describe('With newlines', () => {
    test('Should replace newlines with <br> tags', () => {
      expect(String(nl2br('line one\nline two'))).toBe('line one<br>line two')
    })

    test('Should replace multiple newlines', () => {
      expect(String(nl2br('a\nb\nc'))).toBe('a<br>b<br>c')
    })
  })

  describe('With HTML characters', () => {
    test('Should escape ampersands', () => {
      expect(String(nl2br('a & b'))).toBe('a &amp; b')
    })

    test('Should escape angle brackets', () => {
      expect(String(nl2br('<script>'))).toBe('&lt;script&gt;')
    })

    test('Should escape double quotes', () => {
      expect(String(nl2br('"quoted"'))).toBe('&quot;quoted&quot;')
    })

    test('Should escape HTML and replace newlines', () => {
      expect(String(nl2br('<b>bold</b>\nnext line'))).toBe(
        '&lt;b&gt;bold&lt;/b&gt;<br>next line'
      )
    })
  })
})
