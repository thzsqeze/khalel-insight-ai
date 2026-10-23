import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabasePublicConfig, supabaseServiceConfig } from './config';
export function serviceClient() {
 const {url,key}=supabaseServiceConfig();
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
export async function sessionClient() {
 const jar=await cookies();
 const {url,key}=supabasePublicConfig();
 return createServerClient(url,key,{
  cookies:{
   getAll:()=>jar.getAll(),
   setAll:values=>{
    try { values.forEach(({name,value,options})=>jar.set(name,value,{...options,httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'})); }
    catch { /* Read-only Server Components receive refreshed cookies through src/proxy.ts. */ }
   }
  }
 });
}
