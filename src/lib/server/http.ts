import 'server-only';
import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApiError } from './errors';
import { getRepository } from './repository';
import { captureServerError } from './diagnostics';
export { assertSameOrigin } from './origin';
export async function readJson(request:Request):Promise<unknown>{
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))throw new ApiError('invalid_input');
 if(Number(request.headers.get('content-length')??0)>16384)throw new ApiError('invalid_input',413);
 const reader=request.body?.getReader();if(!reader)throw new ApiError('invalid_input');let size=0;const chunks:Uint8Array[]=[];
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>16384){await reader.cancel();throw new ApiError('invalid_input',413);}chunks.push(value);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch(error){if(error instanceof ApiError)throw error;throw new ApiError('invalid_input');}
}
export async function rateLimit(request:Request,scope:string,limit:number,windowMs=60*60*1000){
 // Only trust a header configured to be overwritten by the deployment's ingress.
 const header=process.env.TRUSTED_IP_HEADER;const ip=header?request.headers.get(header)?.split(',')[0]?.trim():'shared-ingress';
 const key=createHash('sha256').update(`${process.env.RATE_LIMIT_SALT??'khalel'}:${ip??'unknown'}`).digest('hex');
 if(!await getRepository().consumeRateLimit(key,scope,limit,windowMs))throw new ApiError('rate_limited',429);
}
export async function respond(action: () => Promise<unknown>, status = 200) {
  try {
    return NextResponse.json(await action(), { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) {
    const known = error instanceof ApiError;
    const invalid = error instanceof ZodError;
    if ((!known && !invalid) || (known && error.status >= 500)) await captureServerError(error);
    return NextResponse.json(
      { error: known ? error.code : invalid ? 'invalid_input' : 'unavailable' },
      { status: known ? error.status : invalid ? 400 : 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
