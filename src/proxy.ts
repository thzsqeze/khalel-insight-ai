import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { supabasePublicConfig } from '@/lib/server/config';

export async function proxy(request:NextRequest){
 let response=NextResponse.next({request});
 try{
  const {url,key}=supabasePublicConfig();
  const client=createServerClient(url,key,{
   cookies:{
    getAll:()=>request.cookies.getAll(),
    setAll:values=>{
     values.forEach(({name,value})=>request.cookies.set(name,value));
     response=NextResponse.next({request});
     values.forEach(({name,value,options})=>response.cookies.set(name,value,{...options,httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'}));
    }
   }
  });
  await client.auth.getClaims();
 }catch{
  // Configuration/provider failures never grant access. Layouts and every admin
  // endpoint independently validate the user and the database-assigned role.
 }
 // SSR 0.8 setAll provides cookies only; set anti-cache headers explicitly.
 response.headers.set('Cache-Control','private, no-store, max-age=0');
 response.headers.set('Pragma','no-cache');
 response.headers.set('Expires','0');
 return response;
}
export const config={matcher:['/admin/:path*','/api/admin/:path*']};
