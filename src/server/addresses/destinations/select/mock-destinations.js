import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const destinationsAddressesFilePath = path.join(
  dirname,
  'mock-destinations.json'
)

export const destinations = JSON.parse(
  readFileSync(destinationsAddressesFilePath, 'utf-8')
)
