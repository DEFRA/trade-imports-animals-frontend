import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestServer } from './test-server.js'

/** Interrogation Level 3: both model files served verbatim, no session. */

const dirname = path.dirname(fileURLToPath(import.meta.url))
const modelFile = (file) =>
  fs.readFileSync(path.join(dirname, '..', 'model', file), 'utf8')

let t
beforeEach(async () => {
  t = await createTestServer()
})
afterEach(() => t.stop())

describe('routes/model-endpoints', () => {
  it.each(['obligations.json', 'flow.json'])(
    'serves model/%s verbatim as JSON without a journey cookie',
    async (file) => {
      const response = await t.get(`${t.base}/model/${file}`)
      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toContain('application/json')
      expect(response.payload).toBe(modelFile(file))
      expect(response.headers['set-cookie']).toBeUndefined()
    }
  )
})
