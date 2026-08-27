/**
 * The sections of a notification, as named in the caption above a page
 * heading.
 *
 * Journey chrome rather than page copy: the caption names where a page sits
 * in the notification, so one string serves every page in the section. Which
 * pages belong to which section is data in `section-captions/index.js` — never
 * a string chosen page by page.
 */
export const copy = {
  sections: {
    dashboard: 'Dashboard',
    aboutTheConsignment: 'About the consignment',
    commodityDetails: 'Commodity details',
    consignmentParties: 'Consignment parties',
    movement: 'Movement',
    transportAndArrival: 'Transport and arrival',
    newTransporter: 'Add a new transporter',
    documents: 'Documents'
  }
}
