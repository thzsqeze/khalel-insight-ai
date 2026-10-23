import { describe, expect, it } from 'vitest';
import { feedbackSchema, issuePatchSchema } from '@/lib/server/validation';
import { createTrackingCode, hashTrackingCode, redactForAI, signDemoSession, verifyDemoSession } from '@/lib/server/security';
const input = {role:'student', category:'education', description:'Не хватает практических занятий по предмету.', locale:'ru', consent:true, aiConsent:false, startedAt:Date.now()-5000};
describe('server validation and privacy', () => {
 it('accepts anonymous submissions without faculty or identity', () => expect(feedbackSchema.parse(input).faculty).toBeUndefined());
 it.each([{role:'admin'},{consent:false},{description:'short'},{website:'spam.example'},{startedAt:Date.now()+1000},{startedAt:Date.now()}])('rejects invalid input %j', patch => expect(feedbackSchema.safeParse({...input,...patch}).success).toBe(false));
 it('rejects unknown fields and public summaries containing contact information', () => {
  expect(feedbackSchema.safeParse({...input,email:'student@example.com'}).success).toBe(false);
  expect(issuePatchSchema.safeParse({publicSummary:'Свяжитесь с test@example.com для ответа'}).success).toBe(false);
 });
 it('creates unpredictable 192bit tracking codes with one way storage', () => {
  const a=createTrackingCode(),b=createTrackingCode();expect(a).not.toBe(b);expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);expect(hashTrackingCode(a)).toHaveLength(64);expect(hashTrackingCode(a)).not.toContain(a);
 });
 it('redacts contact identifiers and suppresses uncertain named text', () => {
  const result=redactForAI('Меня зовут Иван Петров, почта student@example.com и телефон +7 777 123 45 67.');
  expect(result.text).not.toMatch(/Иван|Петров|student@|777/);expect(result.sensitiveData).toBe(true);
  expect(redactForAI('Преподаватель Айгүл обратилась ко мне.').safe).toBe(false);
 });
 it('rejects forged, expired, and production demo sessions', () => {
  const secret='a'.repeat(64);const token=signDemoSession(secret,Date.now()+10000);
  expect(verifyDemoSession(token,secret,true)).toBe(true);
  expect(verifyDemoSession(token+'x',secret,true)).toBe(false);
  expect(verifyDemoSession(signDemoSession(secret,Date.now()-1),secret,true)).toBe(false);
  expect(verifyDemoSession(token,secret,false)).toBe(false);
 });
});
