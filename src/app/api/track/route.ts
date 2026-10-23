import { z } from 'zod';
import { respond, assertSameOrigin, readJson, rateLimit } from '@/lib/server/http';
import { getRepository } from '@/lib/server/repository';
import { ApiError } from '@/lib/server/errors';
export const runtime='nodejs';
export async function POST(request:Request){return respond(async()=>{assertSameOrigin(request);await rateLimit(request,'track',30,10*60*1000);const {code}=z.object({code:z.string().trim().min(1).max(128)}).strict().parse(await readJson(request));const result=await getRepository().track(code);if(!result)throw new ApiError('not_found',404);return result;});}
