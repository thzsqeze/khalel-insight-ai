import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const fixture=vi.hoisted(()=>({user:null as null|{id:string;email:string;user_metadata:{role:string}},userError:null as null|{message:string},role:'viewer',profileError:null as null|{message:string},selectedId:'',signedOut:false,cookies:new Map<string,string>()}));
vi.mock('next/headers',()=>({cookies:async()=>({get:(name:string)=>fixture.cookies.has(name)?{name,value:fixture.cookies.get(name)}:undefined,getAll:()=>Array.from(fixture.cookies,([name,value])=>({name,value})),set:(name:string,value:string)=>fixture.cookies.set(name,value),delete:(name:string)=>fixture.cookies.delete(name)})}));
vi.mock('@/lib/server/supabase',()=>({
 sessionClient:async()=>({
  auth:{
   getUser:async()=>({data:{user:fixture.user},error:fixture.userError}),
   signInWithPassword:async()=>({data:{user:fixture.user},error:fixture.userError}),
   signOut:async()=>{fixture.signedOut=true;return {error:null};}
  },
  from:(table:string)=>{
   if(table!=='profiles')throw new Error('Unexpected table');
   return {select:(columns:string)=>{
    if(columns!=='role')throw new Error('Unexpected projection');
    return {eq:(column:string,id:string)=>{
     if(column!=='id')throw new Error('Unexpected filter');fixture.selectedId=id;
     return {single:async()=>({data:fixture.user&&id===fixture.user.id?{role:fixture.role}:null,error:fixture.profileError})};
    }};
   }};
  }
 }),
 serviceClient:()=>{throw new Error('No service call allowed in authorization tests');}
}));
import { getAdminSession, login } from '@/lib/server/auth';
import { GET as overview } from '@/app/api/admin/overview/route';
import { POST as createIssue } from '@/app/api/admin/issues/route';
import { GET as detail, PATCH as patchIssue } from '@/app/api/admin/issues/[id]/route';
import { POST as membership } from '@/app/api/admin/issues/[id]/members/route';
import { POST as analysis } from '@/app/api/admin/submissions/[id]/analysis/route';
import { POST as review } from '@/app/api/admin/submissions/[id]/review/route';
import { POST as loginRoute } from '@/app/api/auth/login/route';
beforeEach(()=>{fixture.user=null;fixture.userError=null;fixture.role='viewer';fixture.profileError=null;fixture.selectedId='';fixture.signedOut=false;fixture.cookies.clear();vi.stubEnv('DEMO_MODE','false');});
afterEach(()=>vi.unstubAllEnvs());
const user={id:'00000000-0000-4000-8000-000000000001',email:'admin@example.test',user_metadata:{role:'admin'}};
describe('real server authorization',()=>{
 it('never accepts a valid legacy demo cookie even when the old environment flag is enabled',async()=>{
  vi.stubEnv('DEMO_MODE','true');vi.stubEnv('DEMO_SESSION_SECRET','test-secret');const payload=Buffer.from(JSON.stringify({role:'admin',expires:Date.now()+100000})).toString('base64url');fixture.cookies.set('khalel_demo_session',`${payload}.${createHmac('sha256','test-secret').update(payload).digest('base64url')}`);
  expect(await getAdminSession()).toBeNull();
 });
 it.each(['admin','moderator'])('accepts a verified Supabase user with server-granted %s role',async role=>{fixture.user=user;fixture.role=role;vi.stubEnv('DEMO_MODE','true');expect(await getAdminSession()).toEqual({id:user.id,email:user.email,role});expect(fixture.selectedId).toBe(user.id);});
 it('does not trust admin metadata without the database role',async()=>{fixture.user=user;expect(await getAdminSession()).toBeNull();});
 it('fails closed for failed identity validation and failed profile lookup',async()=>{fixture.user=user;fixture.role='admin';fixture.userError={message:'invalid token'};expect(await getAdminSession()).toBeNull();fixture.userError=null;fixture.profileError={message:'database unavailable'};expect(await getAdminSession()).toBeNull();});
 it('rejects legacy demo login input before accessing the database',async()=>{vi.stubEnv('DEMO_MODE','true');const response=await loginRoute(new Request('http://localhost:3000/api/auth/login',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json'},body:JSON.stringify({demo:true})}));expect(response.status).toBe(400);expect(await response.json()).toEqual({error:'invalid_input'});});
 it('signs out real users without a staff role after password authentication',async()=>{fixture.user=user;await expect(login({email:user.email,password:'test-password'})).rejects.toThrow('forbidden');expect(fixture.signedOut).toBe(true);});
 it('denies every admin API independently for an unverified request',async()=>{
  fixture.cookies.set('role','admin');const request=()=>new Request('http://localhost:3000/api/admin/issues',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json','x-role':'admin'},body:'{}'});const context={params:Promise.resolve({id:user.id})};
  for(const response of await Promise.all([overview(),createIssue(request()),detail(request(),context),patchIssue(request(),context),membership(request(),context),analysis(request(),context),review(request(),context)])){expect(response.status).toBe(401);expect(await response.json()).toEqual({error:'unauthorized'});}
 });
});
