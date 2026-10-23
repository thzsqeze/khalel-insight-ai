import { respond } from '@/lib/server/http';
import { getRepository } from '@/lib/server/repository';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){return respond(async()=>({issues:await getRepository().publicIssues()}));}
