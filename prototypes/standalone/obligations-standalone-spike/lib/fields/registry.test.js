import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { slotToView } from './registry.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const { obligations } = JSON.parse(
  fs.readFileSync(
    path.join(dirname, '..', '..', 'model', 'obligations.json'),
    'utf8'
  )
)

const slotFor = (record) => ({
  inputName: record.name,
  label: 'A label',
  type: record.type,
  constraints: record.constraints,
  options: (record.options ?? []).map((value) => ({ value, label: value }))
})

describe('lib/fields/registry — type is the sole widget discriminant', () => {
  it('builds a view for every type in the real catalogue', () => {
    for (const record of obligations) {
      const view = slotToView(slotFor(record))
      expect(view.type).toBeTruthy()
      expect(view.args).toBeTruthy()
    }
  })

  it('dispatches the widget families the journey uses', () => {
    const expectations = [
      ['email', 'input'],
      ['formatted', 'input'],
      ['currency', 'input'],
      ['select', 'select'],
      ['date', 'date'],
      ['boolean', 'radios'],
      ['radio', 'radios'],
      ['multi-select', 'checkboxes'],
      ['textarea', 'textarea'],
      ['file', 'file']
    ]
    for (const [type, viewType] of expectations) {
      expect(slotToView({ inputName: 'f', label: 'F', type }).type).toBe(
        viewType
      )
    }
  })

  it('falls back to a text input for unknown types (open type space)', () => {
    const view = slotToView({ inputName: 'f', label: 'F', type: 'hologram' })
    expect(view.type).toBe('input')
    expect(view.args.name).toBe('f')
  })

  it('never emits required for any catalogue type (TOOL-13 ban)', () => {
    for (const record of obligations) {
      expect(JSON.stringify(slotToView(slotFor(record)))).not.toContain(
        '"required"'
      )
    }
  })
})
