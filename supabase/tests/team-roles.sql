-- Run as database owner only after owner_team_access migration.
-- Every identity, role change, and audit event is rolled back.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id,email,aud,role,raw_user_meta_data,email_confirmed_at,created_at,updated_at)
values
('91000000-0000-4000-8000-000000000001','role-test-owner@example.invalid','authenticated','authenticated','{}',now(),now(),now()),
('91000000-0000-4000-8000-000000000002','role-test-admin@example.invalid','authenticated','authenticated','{}',now(),now(),now()),
('91000000-0000-4000-8000-000000000003','role-test-moderator@example.invalid','authenticated','authenticated','{}',now(),now(),now()),
('91000000-0000-4000-8000-000000000004','role-test-viewer@example.invalid','authenticated','authenticated','{"role":"owner"}',now(),now(),now()),
('91000000-0000-4000-8000-000000000005','role-test-unconfirmed@example.invalid','authenticated','authenticated','{}',null,now(),now());
-- Isolate the owner count for the last-owner assertion. Existing grants are
-- restored by rollback and no change is visible outside this transaction.
update public.profiles set is_owner=false where is_owner;
update public.profiles set role=case id
 when '91000000-0000-4000-8000-000000000001'::uuid then 'admin'
 when '91000000-0000-4000-8000-000000000002'::uuid then 'admin'
 when '91000000-0000-4000-8000-000000000003'::uuid then 'moderator'
 else 'viewer' end, is_owner=(id='91000000-0000-4000-8000-000000000001'::uuid)
where id in ('91000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000003','91000000-0000-4000-8000-000000000004','91000000-0000-4000-8000-000000000005');

set local role anon;
do $$begin
 begin perform public.change_role('91000000-0000-4000-8000-000000000004','owner');raise exception 'Anonymous grant succeeded';exception when insufficient_privilege then null;end;
 begin perform * from public.team_role_events;raise exception 'Anonymous role audit read succeeded';exception when insufficient_privilege then null;end;
end$$;
reset role;

set local role authenticated;
do $$declare who uuid;begin
 foreach who in array array['91000000-0000-4000-8000-000000000002'::uuid,'91000000-0000-4000-8000-000000000003'::uuid,'91000000-0000-4000-8000-000000000004'::uuid] loop
  perform set_config('request.jwt.claim.sub',who::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',who,'role','authenticated','user_metadata',jsonb_build_object('role','owner'))::text,true);
  begin perform public.change_role('91000000-0000-4000-8000-000000000004','owner');raise exception 'Nonowner grant succeeded';exception when insufficient_privilege then null;end;
  begin update public.profiles set is_owner=true where id=who;raise exception 'Direct role write succeeded';exception when insufficient_privilege then null;end;
 end loop;
end$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$begin
 if not public.is_staff() then raise exception 'Owner denied staff access';end if;
 begin perform public.change_role(auth.uid(),'viewer');raise exception 'Last-owner removal succeeded';exception when raise_exception then if sqlerrm<>'last_owner' then raise;end if;end;
 begin perform public.change_role(auth.uid(),'owner');raise exception 'Self-role mutation succeeded';exception when raise_exception then if sqlerrm<>'self_role_change' then raise;end if;end;
 begin perform public.change_role('91000000-0000-4000-8000-000000000005','admin');raise exception 'Unconfirmed grant succeeded';exception when raise_exception then if sqlerrm<>'user_unconfirmed' then raise;end if;end;
 perform public.change_role('91000000-0000-4000-8000-000000000004','moderator');
 if not exists(select 1 from public.team_role_events where actor=auth.uid() and target='91000000-0000-4000-8000-000000000004' and old_role='viewer' and new_role='moderator') then raise exception 'Role audit missing';end if;
 perform public.change_role('91000000-0000-4000-8000-000000000002','owner');
end$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.change_role('91000000-0000-4000-8000-000000000001','viewer');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"role":"owner"}}',true);
do $$begin
 if public.is_staff() then raise exception 'Revoked owner retained staff access';end if;
 begin perform public.change_role('91000000-0000-4000-8000-000000000004','owner');raise exception 'Revoked owner grant succeeded';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.team_role_events) then raise exception 'Revoked owner can read role audit';end if;
end$$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"sub":"91000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
do $$begin
 if exists(select 1 from public.team_role_events) then raise exception 'Staff can read private role audit';end if;
end$$;
reset role;

set local role service_role;
do $$begin
 begin perform public.change_role('91000000-0000-4000-8000-000000000004','owner');raise exception 'Service-role bypassed verified caller boundary';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
\echo 'Owner grants, revocation, last-owner/self protection, confirmation and audit permissions passed.'
