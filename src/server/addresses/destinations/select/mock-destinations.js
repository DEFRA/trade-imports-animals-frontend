import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { createLogger } from '../../../common/helpers/logging/logger.js'

const logger = createLogger()
const moduleDir = path.dirname(fileURLToPath(import.meta.url))
const mockDestinationsPath = path.join(moduleDir, 'mock-destinations.json')

let destinationsList
try {
  destinationsList = JSON.parse(readFileSync(mockDestinationsPath, 'utf-8'))
} catch (err) {
  logger.error(
    `Failed to load mock destinations from ${mockDestinationsPath}: ${err.message}`
  )
  throw new Error(
    `Cannot start server: mock-destinations.json is missing or invalid. ${err.message}`
  )
}

export const destinations = destinationsList
