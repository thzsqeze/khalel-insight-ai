import 'server-only';
import { randomBytes, randomUUID } from 'node:crypto';
import type { AdminSnapshot, Analysis, FeedbackInput, Issue, IssueDetail, PublicIssue, StatusEvent, Submission, TrackingResult } from '@/lib/types';
import type { IssueCreate, IssuePatch, ReviewInput } from './validation';
import type { Receipt, Repository } from './repository-contract';
import { serviceClient } from './supabase';
import { createTrackingCode, hashTrackingCode, isSafePublicTitle } from './security';
import { ApiError } from './errors';
type Row=Record<string,unknown>;
function submission(row:Row):Submission{return {id:String(row.id),reference:String(row.reference),role:row.role as Submission['role'],category:row.category as Submission['category'],description:String(row.description),faculty:row.faculty as string|null,locale:row.locale as Submission['locale'],aiConsent:Boolean(row.ai_consent),createdAt:String(row.created_at),issueId:row.issue_id as string|null,analysis:row.analysis as Analysis|null,analysisStatus:row.analysis_status as Submission['analysisStatus']};}
function issue(row:Row,count:number):Issue{return {id:String(row.id),reference:String(row.reference),title:String(row.title),...(row.title_kk?{titleKk:String(row.title_kk)}:{}),category:row.category as Issue['category'],status:row.status as Issue['status'],priority:row.priority as Issue['priority'],owner:row.owner as string|null,publicSummary:row.public_summary as string|null,published:Boolean(row.published),resolutionNote:row.resolution_note as string|null,createdAt:String(row.created_at),updatedAt:String(row.updated_at),count};}
function event(row:Row):StatusEvent{return {id:String(row.id),issueId:String(row.issue_id),status:row.status as StatusEvent['status'],note:row.note as string|null,actor:String(row.actor??'system'),createdAt:String(row.created_at)};}
function check(error:{message:string;code?:string}|null){
 if(!error)return;
 if(error.message.includes('not_found'))throw new ApiError('not_found',404);
 if(error.message.includes('invalid_input')||error.code==='23514')throw new ApiError('invalid_input');
 if(error.message.includes('forbidden'))throw new ApiError('forbidden',403);
 // Provider messages, details and hints can contain report content. Keep only
 // standard SQLSTATE/PostgREST codes in the hosting platform's operational log.
 const code=error.code&&/^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(error.code)?error.code:'unknown';
 console.error('[UniVoice database] Request failed',{code});
 throw new ApiError('unavailable',503);
}
export class ProductionRepository implements Repository {
 private client=serviceClient();
 async createSubmission(input:FeedbackInput):Promise<Receipt>{const id=randomUUID(),trackingCode=createTrackingCode(),reference=`UV-${randomBytes(5).toString('hex').toUpperCase()}`,analysisStatus=input.aiConsent?'pending':'skipped';const {error}=await this.client.from('submissions').insert({id,reference,tracking_hash:hashTrackingCode(trackingCode),role:input.role,category:input.category,description:input.description,faculty:input.faculty||null,locale:input.locale,consent:true,ai_consent:input.aiConsent,analysis_status:analysisStatus});check(error);return {id,trackingCode,reference,analysisStatus};}
 async getSubmission(id:string){const {data,error}=await this.client.from('submissions').select('*').eq('id',id).maybeSingle();check(error);return data?submission(data):null;}
 async track(code:string):Promise<TrackingResult|null>{const {data,error}=await this.client.rpc('track_submission',{p_hash:hashTrackingCode(code)});check(error);return data as TrackingResult|null;}
 async snapshot():Promise<AdminSnapshot>{
  // Explicit paging avoids Supabase's default 1,000-row truncation in analytics.
  const load=async(table:string):Promise<Row[]>=>{const rows:Row[]=[];for(let offset=0;;offset+=1000){const {data,error}=await this.client.from(table).select('*').order('created_at',{ascending:false}).order('id').range(offset,offset+999);check(error);rows.push(...data??[]);if(!data||data.length<1000)break;}return rows;};
  const [subs,issues,events]=await Promise.all([load('submissions'),load('issues'),load('status_events')]);return {submissions:subs.map(submission),issues:issues.map(row=>issue(row,subs.filter(sub=>sub.issue_id===row.id).length)),events:events.map(event)};
 }
 async publicIssues():Promise<PublicIssue[]>{const {data,error}=await this.client.rpc('public_issues');check(error);return (data??[]) as PublicIssue[];}
 async issueDetail(id:string):Promise<IssueDetail|null>{const snapshot=await this.snapshot();const item=snapshot.issues.find(row=>row.id===id);if(!item)return null;const {data,error}=await this.client.rpc('match_issue_submissions',{p_issue_id:id,p_limit:8});check(error);const matches=(data??[]) as {submission_id:string;similarity:number}[];return {issue:item,submissions:snapshot.submissions.filter(row=>row.issueId===id),events:snapshot.events.filter(row=>row.issueId===id).reverse(),similar:matches.flatMap(match=>{const sub=snapshot.submissions.find(row=>row.id===match.submission_id);return sub?[{submission:sub,similarity:match.similarity}]:[]})};}
 private async action(action:string,payload:unknown,actor:string):Promise<string>{const {data,error}=await this.client.rpc('admin_action',{p_action:action,p_payload:payload,p_actor:actor});check(error);return data as string;}
 async createIssue(input:IssueCreate,actor:string){return this.action('create_issue',input,actor);}
 async patchIssue(id:string,patch:IssuePatch,actor:string){const {data,error}=await this.client.from('issues').select('title,published').eq('id',id).maybeSingle();check(error);if(!data)throw new ApiError('not_found',404);const title=patch.title??data.title;const published=patch.title&&patch.title!==data.title&&patch.publicSummary===undefined?false:(patch.published??data.published);if(published&&(!data.published||title!==data.title)&&!isSafePublicTitle(title))throw new ApiError('invalid_input');await this.action('patch_issue',{id,...patch,published,validatedPublicTitle:published?title:null},actor);}
 async membership(id:string,submissionId:string,action:'add'|'remove',actor:string){await this.action('membership',{id,submissionId,action},actor);}
 async saveAnalysis(id:string,analysis:Analysis|null,status:Submission['analysisStatus'],embedding?:number[]){const {error}=await this.client.rpc('save_analysis',{p_id:id,p_analysis:analysis,p_status:status,p_embedding:embedding?JSON.stringify(embedding):null});check(error);}
 async reviewAnalysis(id:string,input:ReviewInput,actor:string){await this.action('review_analysis',{id,...input},actor);}
 async consumeRateLimit(key:string,scope:string,limit:number,windowMs:number){const {data,error}=await this.client.rpc('consume_rate_limit',{p_key:key,p_scope:scope,p_limit:limit,p_window_ms:windowMs});check(error);return data===true;}
}
