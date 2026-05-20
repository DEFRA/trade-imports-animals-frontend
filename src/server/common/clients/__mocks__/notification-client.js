import { vi } from 'vitest'

export const notificationClient = {
  save: vi.fn(),
  submitNotification: vi.fn(),
  get: vi.fn()
}
