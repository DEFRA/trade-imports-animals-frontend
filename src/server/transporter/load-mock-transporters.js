import path from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const mockTransportersPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'select',
  'mock-transporters.json'
)

const mockTransporters = JSON.parse(readFileSync(mockTransportersPath, 'utf-8'))

export function loadMockTransporters() {
  return mockTransporters
}
