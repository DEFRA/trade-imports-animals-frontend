function getSafeRedirect(redirect) {
  if (typeof redirect !== 'string' || !redirect.startsWith('/')) {
    return '/'
  }

  if (
    redirect.startsWith('//') ||
    redirect.includes('://') ||
    redirect.includes('\\') ||
    /[\r\n]/.test(redirect)
  ) {
    return '/'
  }

  try {
    const resolved = new URL(redirect, 'http://placeholder')
    if (resolved.origin !== 'http://placeholder') {
      return '/'
    }
    return redirect
  } catch {
    return '/'
  }
}

export { getSafeRedirect }
