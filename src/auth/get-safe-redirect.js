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
    const resolved = new URL(redirect, 'https://placeholder')
    if (resolved.origin !== 'https://placeholder') {
      return '/'
    }
    return redirect
  } catch {
    return '/'
  }
}

export { getSafeRedirect }
