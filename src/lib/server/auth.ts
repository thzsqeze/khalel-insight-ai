import 'server-only';
import { cookies } from 'next/headers';
import type { AdminSession } from '@/lib/types';
import { isDemoMode } from './config';
import { demoRepository } from './repository';
import { verifyDemoSession, signDemoSession } from './security';
import { sessionClient } from './supabase';
import { ApiError } from './errors';
const demoCookie='khalel_demo_session';
export async function getAdminSession():Promise<AdminSession|null>{
 if(isDemoMode()){const jar=await cookies();const token=jar.get(demoCookie)?.value;if(token&&verifyDemoSession(token,demoRepository().sessionSecret(),true))return {id:'demo-admin',email:'demo@univoice.local',role:'admin',demo:true};return null;}
 try{const client=await sessionClient();const {data:{user},error}=await client.auth.getUser();if(error||!user)return null;const {data:profile,error:profileError}=await client.from('profiles').select('role').eq('id',user.id).single();if(profileError||!profile||!['admin','moderator'].includes(profile.role))return null;return {id:user.id,email:user.email??'',role:profile.role as AdminSession['role'],demo:false};}catch{return null;}
}
export async function requireAdmin(){const session=await getAdminSession();if(!session)throw new ApiError('unauthorized',401);return session;}
export async function login(input:{demo?:boolean;email?:string;password?:string}){
 if(input.demo===true){if(!isDemoMode())throw new ApiError('forbidden',403);const jar=await cookies();jar.set(demoCookie,signDemoSession(demoRepository().sessionSecret()),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:8*60*60});return;}
 if(isDemoMode())throw new ApiError('invalid_input');const client=await sessionClient();const {data,error}=await client.auth.signInWithPassword({email:input.email??'',password:input.password??''});if(error||!data.user)throw new ApiError('unauthorized',401);const {data:profile}=await client.from('profiles').select('role').eq('id',data.user.id).single();if(!profile||!['admin','moderator'].includes(profile.role)){await client.auth.signOut();throw new ApiError('forbidden',403);}
}
export async function logout(){const jar=await cookies();jar.delete(demoCookie);if(!isDemoMode()){const client=await sessionClient();await client.auth.signOut();}}
