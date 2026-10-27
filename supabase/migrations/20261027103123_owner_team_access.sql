begin;
-- Keep owners as legacy admins so existing deployed clients retain access.
-- Only this protected flag, never user metadata, grants team management.
alter table public.profiles add column is_owner boolean not null default false;
alter table public.profiles add constraint profiles_owner_is_admin check (not is_owner or role='admin');

create or replace function public.is_staff() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','moderator'));
$$;

create table public.team_role_events (
 id uuid primary key default gen_random_uuid(),
 actor uuid references public.profiles(id) on delete set null,
 target uuid not null,
 old_role text not null check(old_role in ('viewer','moderator','admin','owner')),
 new_role text not null check(new_role in ('viewer','moderator','admin','owner')),
 created_at timestamptz not null default now()
);
create index team_role_events_actor_idx on public.team_role_events(actor);
create index team_role_events_created_at_idx on public.team_role_events(created_at desc);
alter table public.team_role_events enable row level security;
create policy team_roles_owner_read on public.team_role_events for select to authenticated using (
 exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin' and is_owner)
);
revoke all on public.team_role_events from public,anon,authenticated;
grant select on public.team_role_events to authenticated;
grant all on public.team_role_events to service_role;

-- This action uses the verified caller, never an actor ID from the request body.
-- Serialize owner changes before re-reading the actor and owner count. This also
-- prevents two owners from concurrently demoting each other with stale grants.
create function public.change_role(p_target uuid,p_role text) returns void
language plpgsql security definer set search_path='' as $$
declare actor_id uuid := auth.uid(); previous_role text;
begin
 if actor_id is null then raise exception 'forbidden' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(762945102);
 perform 1 from public.profiles where id=actor_id and role='admin' and is_owner for update;
 if not found then raise exception 'forbidden' using errcode='42501'; end if;
 if p_role is null or p_role not in ('viewer','moderator','admin','owner') then raise exception 'invalid_input'; end if;
 select case when is_owner then 'owner' else role end into previous_role from public.profiles where id=p_target for update;
 if not found then raise exception 'not_found'; end if;
 if previous_role='owner' and p_role<>'owner' and (select count(*) from public.profiles where role='admin' and is_owner)<=1 then
  raise exception 'last_owner';
 end if;
 if actor_id=p_target then raise exception 'self_role_change'; end if;
 if p_role<>'viewer' and not exists(select 1 from auth.users where id=p_target and email_confirmed_at is not null and (banned_until is null or banned_until<now())) then
  raise exception 'user_unconfirmed';
 end if;
 if previous_role=p_role then return; end if;
 update public.profiles set role=case when p_role='owner' then 'admin' else p_role end,is_owner=(p_role='owner') where id=p_target;
 insert into public.team_role_events(actor,target,old_role,new_role) values(actor_id,p_target,previous_role,p_role);
end $$;
revoke all on function public.change_role(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.change_role(uuid,text) to authenticated;

create or replace function public.admin_action(p_action text,p_payload jsonb,p_actor uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare item public.issues; report public.submissions; target uuid; summary text;
begin
 perform 1 from public.profiles where id=p_actor and role in ('admin','moderator') for share;
 if not found then raise exception 'forbidden';end if;
 perform set_config('app.actor_id',p_actor::text,true);
 if p_action='create_issue' then
  select * into report from public.submissions where id=(p_payload->>'submissionId')::uuid for update;
  if not found then raise exception 'not_found';end if;
  if report.issue_id is not null then raise exception 'invalid_input';end if;
  insert into public.issues(reference,title,category) values('UV-'||upper(encode(extensions.gen_random_bytes(5),'hex')),p_payload->>'title',(p_payload->>'category')::public.feedback_category) returning id into target;
  update public.submissions set issue_id=target where id=report.id;
  return target;
 elsif p_action='patch_issue' then
  target:=(p_payload->>'id')::uuid;
  select * into item from public.issues where id=target for update;
  if not found then raise exception 'not_found';end if;
  if p_payload?'title' then
   if item.title is distinct from p_payload->>'title' and not p_payload?'publicSummary' then item.published:=false;end if;
   item.title:=p_payload->>'title';
  end if;
  if p_payload?'category' then item.category:=(p_payload->>'category')::public.feedback_category;end if;
  if p_payload?'status' then item.status:=(p_payload->>'status')::public.issue_status;end if;
  if p_payload?'priority' then item.priority:=(p_payload->>'priority')::public.issue_priority;end if;
  if p_payload?'owner' then item.owner:=p_payload->>'owner';end if;
  if p_payload?'publicSummary' then
   summary:=p_payload->>'publicSummary';
   if summary ~* '(@|https?://|www\.|[0-9][0-9 ()+.-]{8,}[0-9])' then raise exception 'invalid_input';end if;
   item.public_summary:=summary;item.public_reviewed_at:=case when summary is null then null else now() end;item.public_reviewed_by:=case when summary is null then null else p_actor end;
  end if;
  if p_payload?'published' then item.published:=(p_payload->>'published')::boolean;end if;
  if p_payload?'resolutionNote' then item.resolution_note:=p_payload->>'resolutionNote';end if;
  if item.published and (p_payload->>'validatedPublicTitle' is distinct from item.title or item.public_summary is null or item.public_reviewed_at is null or item.title ~* '(@|https?://|www\.)') then raise exception 'invalid_input';end if;
  update public.issues set title=item.title,category=item.category,status=item.status,priority=item.priority,owner=item.owner,public_summary=item.public_summary,public_reviewed_at=item.public_reviewed_at,public_reviewed_by=item.public_reviewed_by,published=item.published,resolution_note=item.resolution_note,updated_at=now() where id=target;
  return target;
 elsif p_action='membership' then
  target:=(p_payload->>'id')::uuid;
  perform 1 from public.issues where id=target for update;if not found then raise exception 'not_found';end if;
  select * into report from public.submissions where id=(p_payload->>'submissionId')::uuid for update;if not found then raise exception 'not_found';end if;
  if p_payload->>'action'='add' then
   if report.issue_id is not null and report.issue_id<>target then raise exception 'invalid_input';end if;
   update public.submissions set issue_id=target where id=report.id;
  elsif p_payload->>'action'='remove' then
   if report.issue_id is distinct from target then raise exception 'invalid_input';end if;
   update public.submissions set issue_id=null where id=report.id;
  else raise exception 'invalid_input';end if;
  update public.issues set updated_at=now() where id=target;return target;
 elsif p_action='review_analysis' then
  target:=(p_payload->>'id')::uuid;
  select * into report from public.submissions where id=target for update;if not found then raise exception 'not_found';end if;
  if report.analysis is null then raise exception 'invalid_input';end if;
  perform (p_payload->>'category')::public.feedback_category;perform (p_payload->>'urgency')::public.issue_priority;
  if char_length(p_payload->>'summary') not between 10 and 1000 then raise exception 'invalid_input';end if;
  update public.submissions set analysis=analysis||jsonb_build_object('category',p_payload->>'category','summary',p_payload->>'summary','urgency',p_payload->>'urgency','reviewed',true,'reviewNeeded',false) where id=target;return target;
 end if;
 raise exception 'invalid_input';
end $$;

-- Replacing existing functions keeps grants, but assert their intended boundary.
revoke all on function public.admin_action(text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.admin_action(text,jsonb,uuid) to service_role;
revoke all on function public.is_staff() from public,anon,authenticated;
grant execute on function public.is_staff() to authenticated,service_role;
commit;
