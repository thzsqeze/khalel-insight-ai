import { respond, assertSameOrigin, readJson, rateLimit } from '@/lib/server/http';
import { login } from '@/lib/server/auth';
import { loginSchema } from '@/lib/server/validation';
export const runtime='nodejs';
export async function POST(request:Request){return respond(async()=>{assertSameOrigin(request);const input=loginSchema.parse(await readJson(request));await rateLimit(request,'login',10,15*60*1000);await login(input);return {ok:true};});}
