import { commodityLines } from './lines.js'

export const species = {
  id: '301b37e7-eee2-448f-97e2-c6057b9f4f76',
  name: 'species',
  within: commodityLines,
  requires: {
    minEntries: 1,
    errorCode: 'obligation.species.atLeastOne'
  }
}

export const eppoCode = {
  id: '01b1a5d6-deda-49f0-b5fe-d5c509a58279',
  name: 'eppoCode',
  within: species,
  status: 'mandatory'
}

export const genusAndSpecies = {
  id: '9f39aa9c-9783-4397-8e52-06cb86148982',
  name: 'genusAndSpecies',
  within: species,
  status: 'mandatory'
}

export const speciesId = {
  id: '760efa03-21b7-4953-a9cf-21c47e020c90',
  name: 'speciesId',
  within: species,
  status: 'optional'
}
