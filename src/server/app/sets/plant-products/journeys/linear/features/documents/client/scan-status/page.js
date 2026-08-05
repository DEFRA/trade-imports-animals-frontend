// Every client-side URL is derived from the page it is already on, so the
// /plant-products mount prefix and the journey id are never hand-written here.
const withoutTrailingSlashes = (path) => {
  let end = path.length
  while (end > 0 && path.charAt(end - 1) === '/') {
    end -= 1
  }
  return path.slice(0, end)
}

export const pagePath = () => withoutTrailingSlashes(window.location.pathname)
export const STATUS_ENDPOINT = `${pagePath()}/status`
