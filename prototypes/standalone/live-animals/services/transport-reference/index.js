import {
  MEANS_OF_TRANSPORT,
  OVERLAND_MEANS,
  TRANSPORTER_TYPES
} from './stub.js'

/** The V4 four-value means-of-transport enum — for select options and validation membership. */
export const meansOfTransport = () => MEANS_OF_TRANSPORT

/** The activating subset of means-of-transport that reveals the transited-countries checkboxes. */
export const overlandMeans = () => OVERLAND_MEANS

/** The V4 two-value transporter-type enum — for select options and validation membership. */
export const transporterTypes = () => TRANSPORTER_TYPES
