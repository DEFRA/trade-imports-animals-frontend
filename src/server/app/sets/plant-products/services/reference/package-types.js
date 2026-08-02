export const packageTypeOptions = Object.freeze([
  { value: 'BAG', text: 'Bag' },
  { value: 'BALE', text: 'Bale' },
  {
    value: 'BOTTLE_FLASK_OTHER_GLASS_PACKAGES',
    text: 'Bottle, flask and other glass packages'
  },
  { value: 'BOX', text: 'Box' },
  {
    value: 'BULK_SOLID_GRANULAR_PARTICLES',
    text: 'Bulk solid granular particles ("grains")'
  },
  { value: 'CAN', text: 'Can' },
  { value: 'CARTON', text: 'Carton' },
  { value: 'CASE', text: 'Case' },
  { value: 'CASK', text: 'Cask' },
  { value: 'COFFER', text: 'Coffer' },
  { value: 'CONTAINER', text: 'Container' },
  { value: 'CRATE', text: 'Crate' },
  { value: 'OTHER', text: 'Other' },
  { value: 'PACKAGE', text: 'Package' },
  { value: 'PALLET', text: 'Pallet' },
  { value: 'POLYSTYRENE_BOX', text: 'Polystyrene box' },
  { value: 'TRAY', text: 'Tray' },
  { value: 'TUBE', text: 'Tube' },
  { value: 'VIAL', text: 'Vial' },
  { value: 'WOOD_BUNDLE', text: 'Wood bundle' },
  { value: 'WOOD_CRATE', text: 'Wood crate' },
  { value: 'WOODEN_BARREL', text: 'Wooden barrel' },
  {
    value: 'WOODEN_CASE_WITH_PALLET_BASE',
    text: 'Wooden case with pallet base'
  }
])

export const packageTypeLabel = (code) =>
  packageTypeOptions.find(({ value }) => value === code)?.text
