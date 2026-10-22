import { Readable } from 'node:stream'
import {
  resolveContentDisposition,
  resolveDownloadContentType
} from '../../download-content-type.js'

export const fileResponse = (h, streamed) =>
  h
    .response(Readable.fromWeb(streamed.body))
    .header('Content-Type', resolveDownloadContentType(streamed.headers))
    .header('Content-Disposition', resolveContentDisposition(streamed.headers))
    .header('X-Content-Type-Options', 'nosniff')
