import type { AdminSnapshot, Analysis, FeedbackInput, IssueDetail, PublicIssue, Submission, TrackingResult } from '@/lib/types';
import type { IssueCreate, IssuePatch, ReviewInput } from './validation';
export interface Receipt {trackingCode:string;reference:string;analysisStatus:Submission['analysisStatus'];id:string}
export interface Repository {
 createSubmission(input:FeedbackInput):Promise<Receipt>;
 getSubmission(id:string):Promise<Submission|null>;
 track(code:string):Promise<TrackingResult|null>;
 snapshot():Promise<AdminSnapshot>;
 publicIssues():Promise<PublicIssue[]>;
 issueDetail(id:string):Promise<IssueDetail|null>;
 createIssue(input:IssueCreate,actor:string):Promise<string>;
 patchIssue(id:string,patch:IssuePatch,actor:string):Promise<void>;
 membership(id:string,submissionId:string,action:'add'|'remove',actor:string):Promise<void>;
 saveAnalysis(id:string,analysis:Analysis|null,status:Submission['analysisStatus'],embedding?:number[]):Promise<void>;
 reviewAnalysis(id:string,input:ReviewInput,actor:string):Promise<void>;
 consumeRateLimit(key:string,scope:string,limit:number,windowMs:number):Promise<boolean>;
}
