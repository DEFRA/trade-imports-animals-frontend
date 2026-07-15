import { vi } from 'vitest'

const actual = await vi.importActual('../operators-client.js')

export const {
  toApiOperator,
  fromApiOperator,
  toNotificationOperator,
  toTransporter
} = actual

export const operatorsClient = {
  listOperators: vi.fn().mockResolvedValue({
    items: [],
    page: 1,
    page_size: 25,
    total_items: 0,
    total_pages: 1
  }),
  getOperator: vi.fn().mockResolvedValue(null),
  createOperator: vi.fn().mockResolvedValue({}),
  updateOperator: vi.fn().mockResolvedValue({}),
  deleteOperator: vi.fn().mockResolvedValue(undefined)
}
