import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

export async function runLighthouse(url, { preset = 'mobile' } = {}) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu']
  })

  try {
    const options = {
      logLevel: 'error',
      output: 'json',
      port: chrome.port
    }

    const configOverrides = {
      extends: 'lighthouse:default',
      settings: {
        // Optional: approximate mobile/desktop behaviour
        formFactor: preset, // 'mobile' or 'desktop'
        screenEmulation:
          preset === 'desktop'
            ? { mobile: false, disabled: false }
            : { mobile: true, disabled: false }
      }
    }

    const { lhr } = await lighthouse(url, options, configOverrides)

    return lhr
  } finally {
    await chrome.kill()
  }
}
