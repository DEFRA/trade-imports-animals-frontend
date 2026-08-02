export const copy = {
  caption: 'Description of the goods',
  heading: 'Transport to the Border Control Post (BCP)',
  bcp: {
    label: 'Entry border control post',
    placeholder: 'Select the entry border control post'
  },
  premises: {
    label: 'Inspection premises',
    placeholder: 'Select inspection premises'
  },
  means: {
    heading: 'Means of transport to the BCP',
    label: 'Means of transport to the BCP',
    placeholder: 'Select means of transport to the BCP'
  },
  identification: {
    label: 'Transport identification',
    hint: `To identify the means of transport, enter (one of the following):
flight number
train number
road vehicle registration number
vessel name (for ferries, also the road vehicle registration number)`
  },
  usesContainers: {
    legend:
      'Are any road trailers or shipping containers being used to transport the consignment?',
    hint: 'Provide details of all road trailers and containers or your consignment may be delayed. You may need to contact your haulier for this.',
    yes: 'Yes',
    no: 'No'
  },
  containers: {
    tableCaption: 'Containers and trailers added',
    table: {
      containerNumber: 'Container or trailer number',
      sealNumber: 'Seal number',
      officialSeal: 'Official seal',
      actions: 'Actions'
    },
    containerNumber: {
      label: 'Container or trailer number',
      hint: 'Enter the container identification number, or the trailer registration number or number plate.'
    },
    sealNumber: {
      label: 'Seal number',
      hint: 'Enter the seal number on the official certificate or any other seal mentioned in the accompanying documents.'
    },
    officialSeal: {
      label: 'This is an official seal',
      hint: 'An official seal is affixed under the supervision of the competent authority issuing the certificate.'
    },
    add: 'Add another container or trailer',
    remove: 'Remove',
    notProvided: 'Not provided'
  },
  documentReference: {
    label: 'Transport document reference',
    hint: 'Enter the reference number on the air waybill, bill of lading, sea waybill, road consignment note (CMR) or other transport document.'
  },
  arrivalDate: {
    heading: 'Estimated arrival at BCP',
    legend: 'Estimated arrival date at the BCP',
    hint: 'For example, 27 3 2023',
    day: 'Day',
    month: 'Month',
    year: 'Year'
  },
  arrivalTime: {
    legend: 'Time of estimated arrival',
    hint: `Enter the time using 24 hour format, for example, 14 50.
If you are unsure of the exact time:
Avoid using times on the hour, for example, 00 00
For non-GVMS route, update the time when you know the time of arrival.`,
    hour: 'Hour',
    minute: 'Minutes'
  },
  errors: {
    bcpRequired: 'Select the entry border control post',
    premisesRequired: 'Select the inspection premises',
    meansRequired: 'Select the means of transport to the BCP',
    identificationRequired: 'Enter the transport identification',
    identificationMaxLength:
      'Transport identification must be 50 characters or fewer',
    documentReferenceRequired: 'Enter the transport document reference',
    documentReferenceMaxLength:
      'Transport document reference must be 32 characters or fewer',
    arrivalDateRequired: 'Enter the estimated arrival date at the BCP',
    arrivalDateReal: 'The estimated arrival date must be a real date',
    arrivalDateWindow:
      'The estimated arrival date must be today or within the next 90 days',
    arrivalTimeRequired: 'Enter the estimated arrival time at the BCP',
    arrivalTimeInvalid:
      'Enter a time using the 24-hour format, for example 14 50',
    usesContainersRequired:
      'Select yes if road trailers or shipping containers are being used',
    containerOrSealRequired:
      'Enter a container or trailer number, or a seal number',
    containerNumberMaxLength:
      'Container or trailer number must be 32 characters or fewer',
    sealNumberMaxLength: 'Seal number must be 100 characters or fewer'
  }
}
