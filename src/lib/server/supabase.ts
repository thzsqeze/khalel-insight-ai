import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireEnv } from './config';
export function serviceClient() {
 return createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {auth:{persistSession:false,autoRefreshToken:false}});
}
export async function sessionClient() {
 const jar=await cookies();
 return createServerClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'),requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),{
  cookies:{
   getAll:()=>jar.getAll(),
   setAll:values=>{
    try { values.forEach(({name,value,options})=>jar.set(name,value,{...options,httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'})); }
    catch { /* Server components cannot refresh cookies; route handlers can. */ }
   }
  }
 });
}
