// Every client-side URL is derived from the page it is already on, so the
// /plant-products mount prefix and the journey id are never hand-written here.
export const pagePath = () => window.location.pathname.replace(/\/+$/, '')
export const STATUS_ENDPOINT = `${pagePath()}/status`
