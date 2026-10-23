import { z } from 'zod';
import { respond, assertSameOrigin, rateLimit } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { getRepository } from '@/lib/server/repository';
import { analyzeSubmission } from '@/lib/server/ai';
import { ApiError } from '@/lib/server/errors';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return respond(async()=>{await requireAdmin();assertSameOrigin(request);await rateLimit(request,'analysis',30,60*60*1000);const id=z.uuid().parse((await context.params).id);const repo=getRepository();const sub=await repo.getSubmission(id);if(!sub)throw new ApiError('not_found',404);if(!sub.aiConsent)throw new ApiError('forbidden',403);const result=await analyzeSubmission(sub);await repo.saveAnalysis(id,result.analysis,result.status,result.embedding);return {ok:true};});}
