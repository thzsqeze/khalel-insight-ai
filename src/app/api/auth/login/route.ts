import { z } from 'zod';
import { respond, assertSameOrigin, readJson, rateLimit } from '@/lib/server/http';
import { login } from '@/lib/server/auth';
export const runtime='nodejs';
const schema=z.union([z.object({demo:z.literal(true)}).strict(),z.object({email:z.email().max(254),password:z.string().min(1).max(256)}).strict()]);
export async function POST(request:Request){return respond(async()=>{assertSameOrigin(request);await rateLimit(request,'login',10,15*60*1000);await login(schema.parse(await readJson(request)));return {ok:true};});}
