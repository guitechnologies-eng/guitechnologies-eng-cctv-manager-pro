export const staffRoles=['admin','office','technician'] as const
export type StaffRole=(typeof staffRoles)[number]
export function validateStaffProfileUpdate(name:unknown,role:unknown,active:unknown):
 {full_name:string;role:StaffRole;active:boolean}|null{
 const full_name=typeof name==='string'?name.trim():''
 if(full_name.length<2||full_name.length>120)return null
 if(typeof role!=='string'||!staffRoles.includes(role as StaffRole))return null
 if(typeof active!=='boolean')return null
 return {full_name,role:role as StaffRole,active}
}
