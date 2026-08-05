import { Readable } from 'node:stream'

import {
  resolveContentDisposition,
  resolveDownloadContentType
} from '../../download-content-type.js'

// The backend response is piped straight to the browser — the bytes never land
// in a frontend buffer, so a 10 MB file costs the same as an empty one.
export const fileResponse = (h, streamed) =>
  h
    .response(Readable.fromWeb(streamed.body))
    .header('Content-Type', resolveDownloadContentType(streamed.headers))
    .header('Content-Disposition', resolveContentDisposition(streamed.headers))
    .header('X-Content-Type-Options', 'nosniff')
