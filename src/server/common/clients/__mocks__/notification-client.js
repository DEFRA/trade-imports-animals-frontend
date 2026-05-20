import { vi } from 'vitest'

export const notificationClient = {
  save: vi.fn().mockResolvedValue({ referenceNumber: 'TEST-REF-123' }),
  submitNotification: vi.fn().mockResolvedValue({}),
  get: vi.fn().mockResolvedValue(null),
  findAll: vi.fn().mockResolvedValue([])
}
