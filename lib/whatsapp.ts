// Explicit, user-initiated WhatsApp links. Never send data automatically.
export function sriLankaWhatsAppNumber(phone:string|null|undefined):string|null{
 const digits=String(phone||'').replace(/\D/g,'')
 if(/^94(7\d{8})$/.test(digits))return digits
 if(/^0(7\d{8})$/.test(digits))return '94'+digits.slice(1)
 if(/^7\d{8}$/.test(digits))return '94'+digits
 return null
}

export function serviceShareText(data:{
 customerName:string
 jobNumber:string
 place:string
 reason:string
 status:string
 previousNote?:string|null
}):string{
 const lines=[
  'GUI TECHNOLOGIES - CCTV SERVICE REQUEST',
  'Reference: '+data.jobNumber,
  'Customer: '+data.customerName,
  'Place: '+data.place,
  'Reason: '+data.reason,
  'Current status: '+data.status.replaceAll('_',' ')
 ]
 if(data.previousNote)lines.push('Previous note: '+data.previousNote)
 return lines.join('\n')
}

export function whatsappShareLink(text:string,phone?:string|null):string{
 const number=phone?sriLankaWhatsAppNumber(phone):null
 return 'https://wa.me/'+(number||'')+'?text='+encodeURIComponent(text)
}
