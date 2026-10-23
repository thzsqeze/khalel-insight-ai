import { z } from 'zod';
import { respond, assertSameOrigin, readJson } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { getRepository } from '@/lib/server/repository';
import { reviewSchema } from '@/lib/server/validation';
export const runtime='nodejs';
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return respond(async()=>{const session=await requireAdmin();assertSameOrigin(request);const id=z.uuid().parse((await context.params).id);await getRepository().reviewAnalysis(id,reviewSchema.parse(await readJson(request)),session.id);return {ok:true};});}
