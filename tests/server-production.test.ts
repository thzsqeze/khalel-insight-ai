import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { getRepository } from '@/lib/server/repository';
import { ProductionRepository } from '@/lib/server/production-repository';
beforeEach(()=>{vi.stubEnv('DEMO_MODE','true');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://project.supabase.co');vi.stubEnv('SUPABASE_SECRET_KEY','sb_secret_test');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','');});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('application repository uses only the real database path',()=>{
 it.each(['PGRST301','private-content-not-a-code'])('logs only an allowlisted database code for %s',async(code)=>{
  const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({code,message:'private report text',details:'private details',hint:'private hint'}),{status:401,headers:{'content-type':'application/json'}}));
  await expect(getRepository().publicIssues()).rejects.toThrow('unavailable');
  expect(log).toHaveBeenCalledWith('[UniVoice database] Request failed',{code:code==='PGRST301'?'PGRST301':'unknown',host:'project.supabase.co'});
  expect(JSON.stringify(log.mock.calls)).not.toContain('private');
 });
 it('keeps empty Supabase tables empty even if a legacy demo flag is enabled',async()=>{
  const paths:string[]=[];
  vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{const request=new Request(input,init);expect(request.headers.get('apikey')).toBe('sb_secret_test');paths.push(new URL(request.url).pathname);return new Response('[]',{status:200,headers:{'content-type':'application/json'}});});
  const repo=getRepository();expect(repo).toBeInstanceOf(ProductionRepository);expect(await repo.snapshot()).toEqual({submissions:[],issues:[],events:[]});expect(paths.sort()).toEqual(['/rest/v1/issues','/rest/v1/status_events','/rest/v1/submissions']);expect(await repo.publicIssues()).toEqual([]);
 });
 it('fails rather than substituting fixture data when Supabase denies database access',async()=>{vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({message:'database access denied'}),{status:403,headers:{'content-type':'application/json'}}));await expect(getRepository().snapshot()).rejects.toThrow('unavailable');});
 it('creates UV references for new submissions without changing their private tracking code',async()=>{
  let inserted:Record<string,unknown>={};
  vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{const request=new Request(input,init);inserted=await request.json();return new Response(null,{status:201});});
  const result=await getRepository().createSubmission({role:'student',category:'education',description:'Не хватает практических занятий по предмету.',locale:'ru',consent:true,aiConsent:false,startedAt:Date.now()-5000});
  expect(result.reference).toMatch(/^UV-[A-F0-9]{10}$/);expect(inserted.reference).toBe(result.reference);expect(result.trackingCode).toMatch(/^[A-Za-z0-9_-]{32}$/);expect(inserted.tracking_hash).not.toBe(result.trackingCode);
 });
 it('requires real credentials instead of opening a local seeded database',()=>{vi.stubEnv('SUPABASE_SECRET_KEY','');expect(()=>getRepository()).toThrow('SUPABASE_SECRET_KEY');});
});
