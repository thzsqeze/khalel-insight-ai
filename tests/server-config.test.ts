import { afterEach, describe, expect, it, vi } from 'vitest';
import { supabasePublicConfig, supabaseServiceConfig } from '@/lib/server/config';
afterEach(()=>vi.unstubAllEnvs());
describe('Supabase configuration',()=>{
 it('uses modern publishable and server secret keys before legacy keys',()=>{vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://project.supabase.co');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','sb_publishable_test');vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY','legacy-anon');vi.stubEnv('SUPABASE_SECRET_KEY','sb_secret_test');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','legacy-service');expect(supabasePublicConfig()).toEqual({url:'https://project.supabase.co',key:'sb_publishable_test'});expect(supabaseServiceConfig()).toEqual({url:'https://project.supabase.co',key:'sb_secret_test'});});
 it('supports legacy Supabase projects without fabricating configuration',()=>{vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://project.supabase.co');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','');vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY','legacy-anon');vi.stubEnv('SUPABASE_SECRET_KEY','');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','legacy-service');expect(supabasePublicConfig().key).toBe('legacy-anon');expect(supabaseServiceConfig().key).toBe('legacy-service');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','');expect(()=>supabaseServiceConfig()).toThrow('SUPABASE_SECRET_KEY');});
});
