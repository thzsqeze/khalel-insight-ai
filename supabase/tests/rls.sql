-- Execute with psql as the Supabase database owner against a disposable DB:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
-- Everything is rolled back. A failed assertion aborts with a nonzero exit.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email,aud,role,raw_user_meta_data,created_at,updated_at)
values('10000000-0000-4000-8000-000000000001','khalel-rls-viewer@example.invalid','authenticated','authenticated','{"role":"admin"}',now(),now()),
('10000000-0000-4000-8000-000000000002','khalel-rls-admin@example.invalid','authenticated','authenticated','{}',now(),now());
update public.profiles set role='admin' where id='10000000-0000-4000-8000-000000000002';
do $$begin
 if (select role from public.profiles where id='10000000-0000-4000-8000-000000000001')<>'viewer' then raise exception 'Metadata elevated a profile role';end if;
end$$;
insert into public.issues(id,reference,title,category,public_summary,public_reviewed_at,published)
values('20000000-0000-4000-8000-000000000001','RLS-ISSUE-1','Проверка учебного расписания','timetable','Учебный отдел проверяет расписание занятий.',now(),true),
('20000000-0000-4000-8000-000000000002','RLS-ISSUE-2','Единичная закрытая проблема','education','Кафедра проверяет учебные материалы.',now(),true);
insert into public.submissions(id,reference,tracking_hash,role,category,description,locale,consent,ai_consent,analysis_status,issue_id)
select ('30000000-0000-4000-8000-00000000000'||n)::uuid,'RLS-REPORT-'||n,repeat(n::text,64),'student','timetable','Приватное содержание обращения, которое нельзя публиковать.','ru',true,false,'skipped',
case when n<=3 then '20000000-0000-4000-8000-000000000001'::uuid else '20000000-0000-4000-8000-000000000002'::uuid end from generate_series(1,4) n;

set local role anon;
do $$declare output jsonb;begin
 begin perform * from public.submissions;raise exception 'Anonymous read exposed submissions';exception when insufficient_privilege then null;end;
 begin perform * from public.issues;raise exception 'Anonymous read exposed internal issues';exception when insufficient_privilege then null;end;
 begin perform * from public.profiles;raise exception 'Anonymous read exposed profiles';exception when insufficient_privilege then null;end;
 begin perform public.track_submission(repeat('1',64));raise exception 'Anonymous direct tracking bypassed rate limit';exception when insufficient_privilege then null;end;
 begin perform public.consume_rate_limit('fake','track',10000,1000);raise exception 'Anonymous rate-limit RPC access';exception when insufficient_privilege then null;end;
 output:=public.public_issues();
 if not exists(select 1 from jsonb_array_elements(output) x where x->>'id'='20000000-0000-4000-8000-000000000001') then raise exception 'Reviewed group missing';end if;
 if exists(select 1 from jsonb_array_elements(output) x where x->>'id'='20000000-0000-4000-8000-000000000002') then raise exception 'Singleton leaked';end if;
 if output::text ~ 'description|faculty|analysis|tracking_hash|resolution_note|owner|Приватное' then raise exception 'Private field leaked';end if;
end$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$begin
 if (select count(*) from public.submissions)<>0 then raise exception 'Viewer bypassed submissions RLS';end if;
 if (select count(*) from public.issues)<>0 then raise exception 'Viewer bypassed issues RLS';end if;
 if (select count(*) from public.status_events)<>0 then raise exception 'Viewer bypassed status RLS';end if;
 if (select count(*) from public.audit_events)<>0 then raise exception 'Viewer bypassed audit RLS';end if;
 if (select count(*) from public.submission_embeddings)<>0 then raise exception 'Viewer bypassed embeddings RLS';end if;
 if (select count(*) from public.profiles)<>1 then raise exception 'Viewer profile isolation failed';end if;
 begin update public.profiles set role='admin' where id=auth.uid();raise exception 'Self role escalation succeeded';exception when insufficient_privilege then null;end;
 begin insert into public.profiles(id,role) values(auth.uid(),'admin');raise exception 'Self profile insertion succeeded';exception when insufficient_privilege then null;end;
 begin perform public.admin_action('patch_issue','{"id":"20000000-0000-4000-8000-000000000001","status":"resolved"}','10000000-0000-4000-8000-000000000002');raise exception 'Forged admin RPC succeeded';exception when insufficient_privilege then null;end;
 begin perform public.save_analysis('30000000-0000-4000-8000-000000000001','{}','completed',null);raise exception 'Direct AI write succeeded';exception when insufficient_privilege then null;end;
end$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$begin
 if (select count(*) from public.submissions where reference like 'RLS-REPORT-%')<>4 then raise exception 'Staff read blocked';end if;
 begin update public.profiles set role='admin';raise exception 'Staff profile role writes must use operator connection';exception when insufficient_privilege then null;end;
end$$;
reset role;

set local role service_role;
do $$declare value jsonb;begin
 if not public.consume_rate_limit('test-rls-key','test',2,60000) then raise exception 'First rate limit use failed';end if;
 if not public.consume_rate_limit('test-rls-key','test',2,60000) then raise exception 'Second rate limit use failed';end if;
 if public.consume_rate_limit('test-rls-key','test',2,60000) then raise exception 'Rate limit was exceeded';end if;
 value:=public.track_submission(repeat('1',64));
 if (select array_agg(k order by k) from jsonb_object_keys(value) k)<>array['category','createdAt','events','reference','status'] then raise exception 'Tracking fields are not private';end if;
 begin perform public.save_analysis('30000000-0000-4000-8000-000000000001','{}','completed',null);raise exception 'AI consent bypass';exception when raise_exception then if sqlerrm<>'forbidden' then raise;end if;end;
 begin perform public.admin_action('patch_issue','{"id":"20000000-0000-4000-8000-000000000001","status":"in_progress"}','10000000-0000-4000-8000-000000000001');raise exception 'Viewer actor accepted';exception when raise_exception then if sqlerrm<>'forbidden' then raise;end if;end;
 perform public.admin_action('patch_issue','{"id":"20000000-0000-4000-8000-000000000001","status":"in_progress","owner":"Учебный отдел","validatedPublicTitle":"Проверка учебного расписания"}','10000000-0000-4000-8000-000000000002');
 if public.track_submission(repeat('1',64))->>'status'<>'in_progress' then raise exception 'Tracking did not follow issue status';end if;
 if not exists(select 1 from public.status_events where issue_id='20000000-0000-4000-8000-000000000001' and status='in_progress' and actor='10000000-0000-4000-8000-000000000002') then raise exception 'Status actor missing';end if;
 if not exists(select 1 from public.audit_events where entity_id='20000000-0000-4000-8000-000000000001' and actor='10000000-0000-4000-8000-000000000002') then raise exception 'Audit actor missing';end if;
 perform public.admin_action('membership','{"id":"20000000-0000-4000-8000-000000000001","submissionId":"30000000-0000-4000-8000-000000000001","action":"remove"}','10000000-0000-4000-8000-000000000002');
 if exists(select 1 from jsonb_array_elements(public.public_issues()) x where x->>'id'='20000000-0000-4000-8000-000000000001') then raise exception 'Group remained published below threshold';end if;
end$$;
reset role;
rollback;
\echo 'All Khalel privacy, role, publication, tracking, audit, and rate-limit tests passed.'
