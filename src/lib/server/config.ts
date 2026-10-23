import 'server-only';
export function requireEnv(name: string): string { const value=process.env[name];if(!value)throw new Error(`Missing server configuration: ${name}`);return value; }
export function supabasePublicConfig(){return {url:requireEnv('NEXT_PUBLIC_SUPABASE_URL'),key:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')};}
export function supabaseServiceConfig(){return {url:requireEnv('NEXT_PUBLIC_SUPABASE_URL'),key:process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||requireEnv('SUPABASE_SECRET_KEY')};}
export const PUBLIC_MIN_GROUP = 3;
