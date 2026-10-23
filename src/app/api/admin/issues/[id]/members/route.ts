import { z } from 'zod';
import { respond, assertSameOrigin, readJson } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { getRepository } from '@/lib/server/repository';
import { memberSchema } from '@/lib/server/validation';
export const runtime='nodejs';
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return respond(async()=>{const session=await requireAdmin();assertSameOrigin(request);const id=z.uuid().parse((await context.params).id);const input=memberSchema.parse(await readJson(request));await getRepository().membership(id,input.submissionId,input.action,session.id);return {ok:true};});}
