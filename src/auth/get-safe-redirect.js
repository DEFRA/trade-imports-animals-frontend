function getSafeRedirect(redirect) {
  if (!redirect?.startsWith('/')) {
    return '/'
  }
  return redirect
}

export { getSafeRedirect }
