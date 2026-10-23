import 'server-only';
export function requireEnv(name: string, value: string | undefined): string {
 if(!value){
  console.error(`[UniVoice configuration] Missing required variable: ${name}`);
  throw new Error(`Missing server configuration: ${name}`);
 }
 return value;
}
// Next.js replaces direct NEXT_PUBLIC references at build time. A dynamic
// process.env[name] lookup can read a stale runtime value or nothing on Vercel.
export function supabasePublicConfig(){return {
 url:requireEnv('NEXT_PUBLIC_SUPABASE_URL',process.env.NEXT_PUBLIC_SUPABASE_URL),
 key:requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
};}
export function supabaseServiceConfig(){return {
 url:requireEnv('NEXT_PUBLIC_SUPABASE_URL',process.env.NEXT_PUBLIC_SUPABASE_URL),
 key:requireEnv('SUPABASE_SECRET_KEY',process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY),
};}
export const PUBLIC_MIN_GROUP = 3;
