import { respond, assertSameOrigin } from '@/lib/server/http';
import { logout } from '@/lib/server/auth';
export const runtime='nodejs';
export async function POST(request:Request){return respond(async()=>{assertSameOrigin(request);await logout();return {ok:true};});}
