import { vi } from 'vitest'

export const saveNotification = vi.fn().mockResolvedValue({
  referenceNumber: 'TEST-REF-123'
})
export const submitNotification = vi.fn().mockResolvedValue({})
