export const backendBaseUrl =
  process.env.TRADE_IMPORTS_ANIMALS_BACKEND_URL ?? 'http://localhost:8085'

export const notificationsUrl = `${backendBaseUrl}/notifications`

export const HTTP_BAD_REQUEST = 400
export const HTTP_CONFLICT = 409
export const MAX_PROJECTION_ATTEMPTS = 2
