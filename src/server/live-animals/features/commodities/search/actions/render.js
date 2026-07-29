import * as state from '../../../../engine/index.js'

export const renderSearchOrRemove = async (
  request,
  h,
  query,
  selected,
  typeFilters,
  render
) => {
  const { journey } = await state.get(request, h)
  return render(request, h, journey, { query, selected, typeFilters })
}

export const renderSelectionRequired = async (
  request,
  h,
  query,
  selected,
  typeFilters,
  render,
  selectCommodityError
) => {
  const { journey } = await state.get(request, h)
  return render(request, h, journey, {
    query,
    selected,
    typeFilters,
    errors: { search: selectCommodityError }
  })
}
