import { responsiblePersonForLoad } from '../../../../../../model/obligations/obligations.js'

export const applyResponsiblePersonOverlay = (notification, reader) => {
  const responsiblePerson = reader.scalar(responsiblePersonForLoad)
  if (responsiblePerson !== undefined) {
    notification.responsiblePersonForLoad = responsiblePerson
  }
}
