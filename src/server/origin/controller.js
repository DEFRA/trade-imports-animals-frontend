export const originController = {
  handler(_request, h) {
    return h.view('origin/index', {
      pageTitle: 'Origin',
      heading: 'Country of Origin'
    })
  }
}
