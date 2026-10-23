import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const {cookieValues}=vi.hoisted(()=>({cookieValues:new Map<string,string>()}));
vi.mock('next/headers',()=>({cookies:async()=>({get:(key:string)=>cookieValues.has(key)?{name:key,value:cookieValues.get(key)}:undefined,getAll:()=>Array.from(cookieValues,([name,value])=>({name,value})),set:(name:string,value:string)=>cookieValues.set(name,value),delete:(name:string)=>cookieValues.delete(name)})}));
import { getAdminSession, login } from '@/lib/server/auth';
import { GET as overview } from '@/app/api/admin/overview/route';
import { POST as createIssue } from '@/app/api/admin/issues/route';
import { GET as detail, PATCH as patchIssue } from '@/app/api/admin/issues/[id]/route';
import { POST as membership } from '@/app/api/admin/issues/[id]/members/route';
import { POST as analysis } from '@/app/api/admin/submissions/[id]/analysis/route';
import { POST as review } from '@/app/api/admin/submissions/[id]/review/route';
beforeEach(()=>{cookieValues.clear();vi.stubEnv('DEMO_MODE','true');vi.stubEnv('DEMO_DB_PATH',join(mkdtempSync(join(tmpdir(),'khalel-auth-')),'demo.sqlite'));});
afterEach(()=>vi.unstubAllEnvs());
describe('server authorization cannot be granted by client data',()=>{
 it('rejects a plain role cookie and accepts only the signed server login',async()=>{
  cookieValues.set('role','admin');cookieValues.set('khalel_demo_session','admin');expect(await getAdminSession()).toBeNull();
  await login({demo:true});expect((await getAdminSession())?.role).toBe('admin');
  vi.stubEnv('DEMO_MODE','false');expect(await getAdminSession()).toBeNull();await expect(login({demo:true})).rejects.toThrow('forbidden');
 });
 it('denies all admin API entry points independently even with forged role headers',async()=>{
  cookieValues.set('khalel_demo_session','forged.admin');const request=()=>new Request('http://localhost:3000/api/admin/issues',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json','x-role':'admin'},body:JSON.stringify({role:'admin'})});const context={params:Promise.resolve({id:'00000000-0000-4000-8000-000000000001'})};
  const responses=await Promise.all([overview(),createIssue(request()),detail(request(),context),patchIssue(request(),context),membership(request(),context),analysis(request(),context),review(request(),context)]);
  for(const response of responses){expect(response.status).toBe(401);expect(await response.json()).toEqual({error:'unauthorized'});}
 });
 it('allows a verified demo session to read real private records',async()=>{await login({demo:true});const response=await overview();expect(response.status).toBe(200);const data=await response.json();expect(data.submissions.length).toBeGreaterThan(40);expect(data.demo).toBe(true);});
});
