import { respond, assertSameOrigin, readJson } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { getRepository } from '@/lib/server/repository';
import { issueCreateSchema } from '@/lib/server/validation';
export const runtime='nodejs';
export async function POST(request:Request){return respond(async()=>{const session=await requireAdmin();assertSameOrigin(request);const input=issueCreateSchema.parse(await readJson(request));return {id:await getRepository().createIssue(input,session.id)};},201);}
