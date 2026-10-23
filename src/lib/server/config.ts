import 'server-only';
export function isDemoMode(): boolean { return process.env.DEMO_MODE === 'true'; }
export function requireEnv(name: string): string { const value=process.env[name];if(!value)throw new Error(`Missing server configuration: ${name}`);return value; }
export const PUBLIC_MIN_GROUP = 3;
