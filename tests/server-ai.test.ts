import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeSubmission } from '@/lib/server/ai';
import type { Submission } from '@/lib/types';
const submission:Submission={id:'1',reference:'KI-1',role:'student',category:'education',description:'Не хватает практических занятий по предмету.',faculty:null,locale:'ru',aiConsent:false,createdAt:new Date().toISOString(),issueId:null,analysis:null,analysisStatus:'pending'};
afterEach(()=>vi.unstubAllEnvs());
describe('AI safety and availability',()=>{
 it('skips provider processing when consent is missing even with production enabled',async()=>{vi.stubEnv('DEMO_MODE','false');vi.stubEnv('OPENAI_API_KEY','');expect(await analyzeSubmission(submission)).toEqual({analysis:null,status:'skipped'});});
 it('returns failed without losing report when provider credentials are unavailable',async()=>{vi.stubEnv('DEMO_MODE','false');vi.stubEnv('OPENAI_API_KEY','');expect((await analyzeSubmission({...submission,aiConsent:true})).status).toBe('failed');});
 it('labels local synthetic suggestions as demo and leaves review required',async()=>{vi.stubEnv('DEMO_MODE','true');const result=await analyzeSubmission({...submission,aiConsent:true});expect(result.analysis?.source).toBe('demo');expect(result.analysis?.reviewed).toBe(false);expect(result.analysis?.reviewNeeded).toBe(true);});
 it('withholds text containing uncertain person identifiers before provider access',async()=>{vi.stubEnv('DEMO_MODE','false');vi.stubEnv('OPENAI_API_KEY','test-key');const result=await analyzeSubmission({...submission,aiConsent:true,description:'Преподаватель Айгүл обратилась ко мне.'});expect(result.status).toBe('failed');expect(result.analysis).toBeNull();});
});
