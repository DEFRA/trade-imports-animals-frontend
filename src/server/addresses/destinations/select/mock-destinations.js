import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const moduleDir = path.dirname(fileURLToPath(import.meta.url))
const mockDestinationsPath = path.join(moduleDir, 'mock-destinations.json')

export const destinations = JSON.parse(
  readFileSync(mockDestinationsPath, 'utf-8')
)
