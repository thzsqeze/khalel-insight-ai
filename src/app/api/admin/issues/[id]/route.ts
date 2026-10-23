import { z } from 'zod';
import { respond, assertSameOrigin, readJson } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { getRepository } from '@/lib/server/repository';
import { issuePatchSchema } from '@/lib/server/validation';
import { ApiError } from '@/lib/server/errors';
export const runtime='nodejs';
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,context:Context){return respond(async()=>{await requireAdmin();const id=z.uuid().parse((await context.params).id);const detail=await getRepository().issueDetail(id);if(!detail)throw new ApiError('not_found',404);return detail;});}
export async function PATCH(request:Request,context:Context){return respond(async()=>{const session=await requireAdmin();assertSameOrigin(request);const id=z.uuid().parse((await context.params).id);await getRepository().patchIssue(id,issuePatchSchema.parse(await readJson(request)),session.id);return {ok:true};});}
