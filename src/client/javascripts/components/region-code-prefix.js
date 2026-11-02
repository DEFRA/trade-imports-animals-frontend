class RegionCodePrefix {
  static moduleName = 'app-region-code-prefix'

  constructor($module) {
    const { countryFieldName, prefixesByCountry } = $module.dataset
    const countrySelect = $module
      .closest('form')
      ?.querySelector(`[name="${countryFieldName}"]`)
    const prefixText = $module.querySelector('[data-region-code-prefix-text]')
    if (!countrySelect || !prefixText || !prefixesByCountry) {
      return
    }
    const prefixes = new Map(Object.entries(JSON.parse(prefixesByCountry)))
    countrySelect.addEventListener('change', () => {
      prefixText.textContent = prefixes.get(countrySelect.value) ?? ''
    })
  }
}

export default RegionCodePrefix
