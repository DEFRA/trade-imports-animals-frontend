// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.

/** The Welsh for 'N result(s) available': 'canlyniad' for one, 'o ganlyniadau'
 * for any other count. */
export const welshResultsAvailable = (count) =>
  `${count} ${count === 1 ? 'canlyniad' : 'o ganlyniadau'} ar gael`
