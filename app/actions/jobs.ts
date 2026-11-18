'use server'
import {db} from '../../lib/supabase'
import {revalidatePath} from 'next/cache'
import {redirect} from 'next/navigation'
const read=(f:FormData,k:string,max=500)=>String(f.get(k)||'').trim().slice(0,max)
async function actor(){const s=await db();const {data:{user}}=await s.auth.getUser();if(!user)redirect('/login');const {data:p}=await s.from('profiles').select('role,active').eq('id',user.id).single();if(!p?.active)throw new Error('Account inactive');return {s,user,role:p.role as string}}
function office(role:string){if(role!=='admin'&&role!=='office')throw new Error('Not authorized')}
function done(error:unknown){if(error)throw new Error('Request could not be saved. Check your permissions and inputs.')}
export async function addCustomer(f:FormData){const {s,role}=await actor();office(role);const name=read(f,'name',120);if(!name)throw new Error('Name required');const {error}=await s.from('customers').insert({name,phone:read(f,'phone',40)||null,address:read(f,'address',500)||null});done(error);revalidatePath('/dashboard')}
export async function addJob(f:FormData){const {s,user,role}=await actor();office(role);const title=read(f,'title',180),customer_id=read(f,'customer_id',50),kind=read(f,'kind',30),priority=read(f,'priority',20);if(!title||!customer_id||!['breakdown','site_visit','installation'].includes(kind)||!['low','normal','high','urgent'].includes(priority))throw new Error('Invalid job');const job_number='CCTV-'+crypto.randomUUID().slice(0,8).toUpperCase();const {error}=await s.from('jobs').insert({job_number,title,customer_id,kind,priority,description:read(f,'description',2000)||null,created_by:user.id});done(error);revalidatePath('/dashboard')}
export async function assignJob(f:FormData){const {s,user,role}=await actor();office(role);const {error}=await s.from('job_assignments').insert({job_id:read(f,'job_id',50),technician_id:read(f,'technician_id',50),assigned_by:user.id});done(error);revalidatePath('/dashboard')}
export async function addUpdate(f:FormData){const {s,user}=await actor();const job_id=read(f,'job_id',50),note=read(f,'note',1500);if(!job_id||!note)throw new Error('Job and note required');const {error}=await s.from('job_updates').insert({job_id,author_id:user.id,note});done(error);revalidatePath('/dashboard')}
