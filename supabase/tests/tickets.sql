-- Run after all migrations in an isolated database. All fixtures roll back.
begin;
insert into auth.users(id) values ('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002'),('10000000-0000-4000-8000-000000000003'),('10000000-0000-4000-8000-000000000004') on conflict do nothing;
insert into public.profiles(id,role,is_owner) values ('10000000-0000-4000-8000-000000000001','admin',true),('10000000-0000-4000-8000-000000000002','admin',false),('10000000-0000-4000-8000-000000000003','moderator',false),('10000000-0000-4000-8000-000000000004','viewer',false) on conflict(id) do update set role=excluded.role,is_owner=excluded.is_owner;
insert into public.submissions(id,reference,tracking_hash,role,category,description,locale,consent,ai_consent,analysis_status) values ('20000000-0000-4000-8000-000000000001','TICKET-TEST',repeat('a',64),'student','education','A valid private test description','ru',true,false,'skipped');
set local role service_role;
select public.ticket_action('message','20000000-0000-4000-8000-000000000001','{"kind":"note","body":"secret internal note"}','10000000-0000-4000-8000-000000000002');
select public.ticket_action('message','20000000-0000-4000-8000-000000000001','{"kind":"reply","body":"public reply"}','10000000-0000-4000-8000-000000000003');
select public.ticket_action('patch','20000000-0000-4000-8000-000000000001','{"status":"resolved","priority":"high"}','10000000-0000-4000-8000-000000000002');
do $$ declare data jsonb; begin
 data:=public.track_ticket_submission(repeat('a',64));
 if data->>'status'<>'resolved' or jsonb_array_length(data->'messages')<>1 or data#>>'{messages,0,body}'<>'public reply' then raise exception 'public projection incorrect';end if;
 if data::text like '%secret internal note%' or data::text like '%authorId%' or data::text like '%10000000%' or data::text like '%priority%' then raise exception 'private data leaked';end if;
 if public.track_ticket_submission(repeat('b',64)) is not null then raise exception 'wrong token reads ticket';end if;
 begin perform public.ticket_follow_up(repeat('b',64),'wrong code');raise exception 'wrong token writes ticket';exception when others then if sqlerrm<>'not_found' then raise;end if;end;
 begin perform public.ticket_action('patch','20000000-0000-4000-8000-000000000001','{"status":"new"}','10000000-0000-4000-8000-000000000004');raise exception 'viewer mutation allowed';exception when others then if sqlerrm<>'forbidden' then raise;end if;end;
 begin perform public.ticket_read('10000000-0000-4000-8000-000000000004',null);raise exception 'viewer read allowed';exception when others then if sqlerrm<>'forbidden' then raise;end if;end;
 begin perform public.department_action('create',null,'{"name":"IT","email":"it@example.edu"}','10000000-0000-4000-8000-000000000002');raise exception 'admin department mutation allowed';exception when others then if sqlerrm<>'forbidden' then raise;end if;end;
 begin perform public.ticket_action('patch','20000000-0000-4000-8000-000000000001','{"assigneeId":"10000000-0000-4000-8000-000000000004"}','10000000-0000-4000-8000-000000000002');raise exception 'viewer assignment allowed';exception when others then if sqlerrm<>'invalid_input' then raise;end if;end;
end $$;
select public.ticket_follow_up(repeat('a',64),'visitor follow-up');
do $$ declare data jsonb; dep uuid; delivery jsonb; begin
 data:=public.track_ticket_submission(repeat('a',64));
 if data->>'status'<>'under_review' or jsonb_array_length(data->'messages')<>2 or data#>>'{messages,1,kind}'<>'follow_up' then raise exception 'follow-up did not reopen/add public message';end if;
 if (select count(*) from public.ticket_messages where ticket_id='20000000-0000-4000-8000-000000000001')<>3 then raise exception 'invalid token inserted a message';end if;
 if not exists(select 1 from public.ticket_events where ticket_id='20000000-0000-4000-8000-000000000001' and action='status_changed' and changes->>'to'='under_review') then raise exception 'reopening not audited';end if;
 dep:=public.department_action('create',null,'{"name":"IT","email":"it@example.edu"}','10000000-0000-4000-8000-000000000001');
 perform public.ticket_action('patch','20000000-0000-4000-8000-000000000001',jsonb_build_object('departmentId',dep),'10000000-0000-4000-8000-000000000002');
 delivery:=public.reserve_ticket_email('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001');
 if delivery->>'recipient'<>'it@example.edu' or not (delivery->>'shouldSend')::boolean then raise exception 'email reservation failed';end if;
 delivery:=public.reserve_ticket_email('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001');
 if (delivery->>'shouldSend')::boolean then raise exception 'duplicate email sent';end if;
 perform public.finalize_ticket_email('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','sent','provider-test');
 perform public.department_action('patch',dep,'{"active":false}','10000000-0000-4000-8000-000000000001');
 begin perform public.ticket_action('patch','20000000-0000-4000-8000-000000000001',jsonb_build_object('departmentId',dep),'10000000-0000-4000-8000-000000000002');raise exception 'inactive department assigned';exception when others then if sqlerrm<>'invalid_input' then raise;end if;end;
end $$;
reset role;
do $$ begin
 if has_table_privilege('anon','public.ticket_messages','SELECT') or has_table_privilege('authenticated','public.ticket_messages','SELECT') then raise exception 'direct message access granted';end if;
 if has_function_privilege('anon','public.track_ticket_submission(text)','EXECUTE') or has_function_privilege('authenticated','public.ticket_follow_up(text,text)','EXECUTE') then raise exception 'bearer RPC directly exposed';end if;
 if has_function_privilege('authenticated','public.ticket_action(text,uuid,jsonb,uuid)','EXECUTE') then raise exception 'staff RPC permits forged actor';end if;
end $$;
rollback;
