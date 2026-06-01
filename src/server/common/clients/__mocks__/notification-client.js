import { vi } from 'vitest'

export const notificationClient = {
  save: vi.fn().mockResolvedValue({ referenceNumber: 'TEST-REF-123' }),
  submitNotification: vi.fn().mockResolvedValue({}),
  get: vi.fn().mockResolvedValue(null),
  findAll: vi.fn().mockResolvedValue({
    content: [],
    page: 1,
    size: 20,
    totalElements: 0,
    totalPages: 1
  })
}
