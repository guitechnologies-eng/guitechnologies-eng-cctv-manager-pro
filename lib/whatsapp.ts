// User-initiated sharing: only prepares a WhatsApp message.
// No recipient is selected automatically; staff must choose the internal team chat.
export function serviceShareText(data:{
 customerName:string
 customerPhone?:string|null
 jobNumber:string
 place:string
 reason:string
 status:string
 previousNote?:string|null
}):string{
 const lines=[
  'GUI TECHNOLOGIES - INTERNAL CCTV SERVICE REQUEST',
  'Reference: '+data.jobNumber,
  'Customer: '+data.customerName,
  'Customer phone: '+(data.customerPhone||'Not Provided'),
  'Place: '+data.place,
  'Reason: '+data.reason,
  'Current status: '+data.status.replaceAll('_',' ')
 ]
 if(data.previousNote)lines.push('Previous note: '+data.previousNote)
 return lines.join('\n')
}

export function whatsappShareLink(text:string):string{
 // No customer number or team contact is hardcoded; choose the team/group in WhatsApp.
 return 'https://wa.me/?text='+encodeURIComponent(text)
}
