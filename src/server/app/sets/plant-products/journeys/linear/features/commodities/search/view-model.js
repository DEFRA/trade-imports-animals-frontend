import {
  childrenOf,
  commodityTree,
  searchSpecies
} from '../../../../../services/commodities/index.js'

const pathTo = (nodes, code, ancestors = []) => {
  for (const node of nodes) {
    const path = [...ancestors, node]
    if (node.code === code) {
      return path
    }
    const nested = pathTo(node.children ?? [], code, path)
    if (nested) {
      return nested
    }
  }
  return null
}

export const treeLevel = (parentCode) => {
  const parentPath = parentCode ? pathTo(commodityTree(), parentCode) : []
  const nodes = parentCode ? childrenOf(parentCode) : commodityTree()

  return {
    crumbs: parentPath ?? [],
    rows: nodes.map(({ code, description, children }) => ({
      code,
      description,
      isLeaf: children === undefined
    }))
  }
}

export const speciesResults = (query) =>
  searchSpecies({ genus: query }).map(
    ({ speciesId, eppoCode, genusAndSpecies, commodityCode }) => ({
      speciesId,
      eppoCode,
      genusAndSpecies,
      commodityCode
    })
  )

export const isDuplicateCode = (lines, code) =>
  Array.isArray(lines) &&
  lines.some(({ commoditySelection }) => commoditySelection === code)
