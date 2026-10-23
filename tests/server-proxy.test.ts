import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const fixture=vi.hoisted(()=>({refresh:true}));
vi.mock('@supabase/ssr',()=>({createServerClient:(_url:string,_key:string,options:{cookies:{setAll:(values:{name:string;value:string;options:{path:string}}[])=>void}})=>({auth:{getClaims:async()=>{if(fixture.refresh)options.cookies.setAll([{name:'sb-test-auth-token',value:'refreshed-session',options:{path:'/'}}]);return {data:{claims:{sub:'verified-user'}},error:null};}}})}));
import { proxy } from '@/proxy';
beforeEach(()=>{fixture.refresh=true;vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://project.supabase.co');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','sb_publishable_test');});
afterEach(()=>vi.unstubAllEnvs());
describe('real session refresh proxy',()=>{
 it('passes refreshed cookies to both downstream rendering and the browser without cache reuse',async()=>{const request=new NextRequest('https://app.example/admin');const response=await proxy(request);expect(request.cookies.get('sb-test-auth-token')?.value).toBe('refreshed-session');expect(response.cookies.get('sb-test-auth-token')).toMatchObject({value:'refreshed-session',httpOnly:true,sameSite:'lax'});expect(response.headers.get('x-middleware-request-cookie')).toContain('refreshed-session');expect(response.headers.get('cache-control')).toContain('no-store');});
 it('does not manufacture a session when the provider emits no cookie',async()=>{fixture.refresh=false;const response=await proxy(new NextRequest('https://app.example/api/admin/overview'));expect(response.cookies.getAll()).toHaveLength(0);expect(response.headers.get('location')).toBeNull();});
});
