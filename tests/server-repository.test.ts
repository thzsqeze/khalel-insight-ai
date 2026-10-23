import { beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SQLiteTestRepository } from './fixtures/sqlite-repository';
const report={role:'student' as const,category:'education' as const,description:'Для изучения предмета требуется больше практических занятий.',locale:'ru' as const,consent:true as const,aiConsent:false,startedAt:Date.now()-10000};
let repo:SQLiteTestRepository;let path:string;
beforeEach(()=>{path=join(mkdtempSync(join(tmpdir(),'khalel-test-')),'test.sqlite');repo=new SQLiteTestRepository(path)});
describe('persistent private report workflow',()=>{
 it('persists submissions and keeps raw descriptions out of tracking',async()=>{
  const receipt=await repo.createSubmission(report);const reopened=new SQLiteTestRepository(path);const tracked=await reopened.track(receipt.trackingCode);
  expect(tracked?.reference).toBe(receipt.reference);expect(tracked?.status).toBe('new');expect(Object.keys(tracked!).sort()).toEqual(['category','createdAt','events','reference','status']);expect(await repo.track('invalid-code')).toBeNull();
 });
 it('publishes reviewed groups only above threshold and updates tracking and audit',async()=>{
  const receipts=await Promise.all([repo.createSubmission(report),repo.createSubmission(report),repo.createSubmission(report)]);const snapshot=await repo.snapshot();const first=snapshot.submissions[0];
  const issueId=await repo.createIssue({submissionId:first.id,title:'Практические занятия',category:'education'},'moderator');
  await repo.patchIssue(issueId,{publicSummary:'Кафедра согласует дополнительные практические занятия.',published:true},'moderator');expect(await repo.publicIssues()).toEqual([]);
  for(const sub of snapshot.submissions.slice(1))await repo.membership(issueId,sub.id,'add','moderator');
  const published=await repo.publicIssues();expect(published).toHaveLength(1);expect(published[0].count).toBe(3);expect(JSON.stringify(published)).not.toMatch(/description|faculty|owner|analysis|resolutionNote/);
  await repo.patchIssue(issueId,{status:'in_progress',owner:'Учебный отдел'},'moderator');
  expect((await repo.track(receipts[0].trackingCode))?.status).toBe('in_progress');expect((await repo.issueDetail(issueId))?.events.some(event=>event.status==='in_progress')).toBe(true);
  await repo.membership(issueId,first.id,'remove','moderator');expect(await repo.publicIssues()).toHaveLength(0);
 });
 it('rejects publication when the internal title contains a person name or contact detail',async()=>{
  await repo.createSubmission(report);const sub=(await repo.snapshot()).submissions[0];
  const id=await repo.createIssue({submissionId:sub.id,title:'Преподаватель Айгүл и учебные занятия',category:'education'},'moderator');
  await expect(repo.patchIssue(id,{published:true,publicSummary:'Кафедра проверяет учебные материалы.'},'moderator')).rejects.toThrow('invalid_input');
 });
 it('persists rate limits across repository instances',async()=>{
  expect(await repo.consumeRateLimit('ip-hash','feedback',2,60000)).toBe(true);expect(await new SQLiteTestRepository(path).consumeRateLimit('ip-hash','feedback',2,60000)).toBe(true);expect(await repo.consumeRateLimit('ip-hash','feedback',2,60000)).toBe(false);
 });
 it('starts empty and counts only explicitly inserted test records',async()=>{
  expect(await repo.snapshot()).toEqual({issues:[],submissions:[],events:[]});
  const first=await repo.createSubmission(report);const second=await repo.createSubmission(report);
  const id=await repo.createIssue({submissionId:first.id,title:'Практические занятия',category:'education'},'moderator');
  await repo.membership(id,second.id,'add','moderator');expect((await repo.issueDetail(id))?.issue.count).toBe(2);
 });
 it('keeps an already reviewed published title editable without reclassifying it',async()=>{
  const receipt=await repo.createSubmission(report);const id=await repo.createIssue({submissionId:receipt.id,title:'Практические занятия',category:'education'},'moderator');
  await repo.patchIssue(id,{publicSummary:'Кафедра проверяет учебные материалы.',published:true},'moderator');
  await repo.patchIssue(id,{status:'in_progress',owner:'Учебный отдел'},'moderator');
  expect((await repo.issueDetail(id))?.issue).toMatchObject({status:'in_progress',owner:'Учебный отдел',published:true});
 });
});
