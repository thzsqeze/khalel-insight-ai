import 'server-only';
import type { AdminSession } from '@/lib/types';
import { sessionClient } from './supabase';
import { ApiError } from './errors';
import { loginSchema } from './validation';
export async function getAdminSession():Promise<AdminSession|null>{
 try{
  const client=await sessionClient();
  const {data:{user},error}=await client.auth.getUser();
  if(error||!user)return null;
  const {data:profile,error:profileError}=await client.from('profiles').select('role').eq('id',user.id).single();
  if(profileError||!profile||!['admin','moderator'].includes(profile.role))return null;
  return {id:user.id,email:user.email??'',role:profile.role as AdminSession['role']};
 }catch{return null;}
}
export async function requireAdmin(){const session=await getAdminSession();if(!session)throw new ApiError('unauthorized',401);return session;}
export async function login(input:unknown){
 const credentials=loginSchema.parse(input);
 const client=await sessionClient();
 const {data,error}=await client.auth.signInWithPassword(credentials);
 if(error||!data.user)throw new ApiError('unauthorized',401);
 const {data:profile,error:profileError}=await client.from('profiles').select('role').eq('id',data.user.id).single();
 if(profileError||!profile||!['admin','moderator'].includes(profile.role)){
  await client.auth.signOut();
  throw new ApiError(profileError?'unavailable':'forbidden',profileError?503:403);
 }
}
export async function logout(){const client=await sessionClient();const {error}=await client.auth.signOut();if(error)throw new ApiError('unavailable',503);}
