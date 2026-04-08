document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('commodity-details-form') || document

  const subtotalNoOfAnimalsEl = document.getElementById('subtotalNoOfAnimals')
  const subtotalNoOfPackagesEl = document.getElementById('subtotalNoOfPackages')

  const toIntOrZero = (v) => {
    const n = Number.parseInt(String(v ?? '').trim(), 10)
    return Number.isFinite(n) ? n : 0
  }

  const renderTotals = () => {
    const animalInputs = form.querySelectorAll('input[id^="noOfAnimals-"]')
    const packageInputs = form.querySelectorAll('input[id^="noOfPackages-"]')

    const totalNoOfAnimals = Array.from(animalInputs).reduce(
      (sum, el) => sum + toIntOrZero(el.value),
      0
    )
    const totalNoOfPackages = Array.from(packageInputs).reduce(
      (sum, el) => sum + toIntOrZero(el.value),
      0
    )

    if (subtotalNoOfAnimalsEl) {
      subtotalNoOfAnimalsEl.textContent = String(totalNoOfAnimals)
    }
    if (subtotalNoOfPackagesEl) {
      subtotalNoOfPackagesEl.textContent = String(totalNoOfPackages)
    }
  }

  // Update totals as the user types.
  form.addEventListener('input', (event) => {
    const target = event?.target
    if (!target || target.tagName !== 'INPUT') return
    if (
      target.id?.startsWith('noOfAnimals-') ||
      target.id?.startsWith('noOfPackages-')
    ) {
      renderTotals()
    }
  })

  // render pre-filled values.
  renderTotals()
})
