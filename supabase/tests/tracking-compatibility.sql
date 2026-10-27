-- The old deployed app keeps grouped-issue tracking; new tickets are independent.
-- Every fixture and mutation is rolled back.
begin;
insert into auth.users(id) values ('92000000-0000-4000-8000-000000000001');
update public.profiles set role='admin' where id='92000000-0000-4000-8000-000000000001';
insert into public.issues(id,reference,title,category) values ('92000000-0000-4000-8000-000000000002','COMPAT-ISSUE','Compatibility test issue','education');
insert into public.submissions(id,reference,tracking_hash,role,category,description,locale,consent,ai_consent,analysis_status,issue_id) values ('92000000-0000-4000-8000-000000000003','COMPAT-REPORT',repeat('d',64),'student','education','Compatibility test report description','ru',true,false,'skipped','92000000-0000-4000-8000-000000000002');
set local role service_role;
select public.ticket_action('patch','92000000-0000-4000-8000-000000000003','{"status":"resolved"}','92000000-0000-4000-8000-000000000001');
do $$ begin
 if public.track_submission(repeat('d',64))->>'status'<>'new' then raise exception 'legacy tracking stopped following grouped issue';end if;
 if public.track_ticket_submission(repeat('d',64))->>'status'<>'resolved' then raise exception 'ticket tracking did not follow ticket';end if;
end $$;
select public.admin_action('patch_issue','{"id":"92000000-0000-4000-8000-000000000002","status":"under_review"}','92000000-0000-4000-8000-000000000001');
do $$ begin
 if public.track_submission(repeat('d',64))->>'status'<>'under_review' then raise exception 'legacy issue update lost tracking status';end if;
 if public.track_ticket_submission(repeat('d',64))->>'status'<>'resolved' then raise exception 'legacy update changed independent ticket status';end if;
 if public.track_submission(repeat('d',64))?'messages' then raise exception 'legacy RPC response shape changed';end if;
 if not public.track_ticket_submission(repeat('d',64))?'messages' then raise exception 'ticket RPC lacks public conversation';end if;
end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.track_submission(text)','EXECUTE') or has_function_privilege('authenticated','public.track_submission(text)','EXECUTE') then raise exception 'legacy tracking RPC exposed';end if;
 if has_function_privilege('anon','public.track_ticket_submission(text)','EXECUTE') or has_function_privilege('authenticated','public.track_ticket_submission(text)','EXECUTE') then raise exception 'ticket tracking RPC exposed';end if;
end $$;
rollback;
