import { after } from 'next/server';
import { respond, assertSameOrigin, readJson, rateLimit } from '@/lib/server/http';
import { feedbackSchema } from '@/lib/server/validation';
import { getRepository } from '@/lib/server/repository';
import { analyzeSubmission } from '@/lib/server/ai';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){return respond(async()=>{assertSameOrigin(request);await rateLimit(request,'feedback',5);const input=feedbackSchema.parse(await readJson(request));const repo=getRepository();const receipt=await repo.createSubmission(input);if(input.aiConsent)after(async()=>{try{const sub=await repo.getSubmission(receipt.id);if(sub){const result=await analyzeSubmission(sub);await repo.saveAnalysis(sub.id,result.analysis,result.status,result.embedding);}}catch{try{await repo.saveAnalysis(receipt.id,null,'failed');}catch{/* Report remains saved and pending for a manual retry. */}}});return {trackingCode:receipt.trackingCode,reference:receipt.reference,analysisStatus:receipt.analysisStatus};},201);}
