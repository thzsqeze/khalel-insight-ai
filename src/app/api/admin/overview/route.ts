import { respond } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { getRepository } from '@/lib/server/repository';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){return respond(async()=>{await requireAdmin();return getRepository().snapshot();});}
