import { describe, expect, it } from 'vitest';
import { assertSameOrigin, readJson } from '@/lib/server/http';
describe('request safety boundaries',()=>{
 it('accepts the actual loopback Host when Next normalizes request.url to localhost',()=>{
  expect(()=>assertSameOrigin(new Request('http://localhost:3000/api/locale',{method:'POST',headers:{origin:'http://127.0.0.1:3000',host:'127.0.0.1:3000','sec-fetch-site':'same-origin'}}))).not.toThrow();
  expect(()=>assertSameOrigin(new Request('http://localhost:3000/api/locale',{method:'POST',headers:{origin:'https://attacker.example',host:'attacker.example','sec-fetch-site':'cross-site'}}))).toThrow('forbidden');
 });
 it('rejects cross origin mutations and missing browser origins',()=>{
  expect(()=>assertSameOrigin(new Request('http://localhost:3000/api/feedback',{method:'POST',headers:{origin:'https://attacker.example'}}))).toThrow('forbidden');
  expect(()=>assertSameOrigin(new Request('http://localhost:3000/api/feedback',{method:'POST'}))).toThrow('forbidden');
  expect(()=>assertSameOrigin(new Request('http://localhost:3000/api/feedback',{method:'POST',headers:{origin:'http://localhost:3000'}}))).not.toThrow();
 });
 it('bounds streamed request bodies without relying on content-length',async()=>{
  const req=new Request('http://localhost:3000/api/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({description:'a'.repeat(17000)})});
  await expect(readJson(req)).rejects.toThrow('invalid_input');
 });
 it('rejects non JSON and malformed JSON',async()=>{
  await expect(readJson(new Request('http://localhost:3000',{method:'POST',body:'hi'}))).rejects.toThrow('invalid_input');
  await expect(readJson(new Request('http://localhost:3000',{method:'POST',headers:{'content-type':'application/json'},body:'{'}))).rejects.toThrow('invalid_input');
 });
});
