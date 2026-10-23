-- UniVoice: run once on a Supabase PostgreSQL database.
-- The service key belongs only in the server runtime. Public writes go through
-- the application's consent, CSRF, size, validation, and rate-limit boundary.
begin;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

create type public.feedback_category as enum ('timetable','education','infrastructure','digital_services','communication','administration','other');
create type public.issue_status as enum ('new','under_review','in_progress','resolved');
create type public.issue_priority as enum ('low','medium','high','critical');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'viewer' check (role in ('viewer','admin','moderator')),
 created_at timestamptz not null default now()
);
create table public.issues (
 id uuid primary key default gen_random_uuid(),
 reference text not null unique,
 title text not null check (char_length(title) between 5 and 180),
 title_kk text check (char_length(title_kk)<=180),
 category public.feedback_category not null,
 status public.issue_status not null default 'new',
 priority public.issue_priority not null default 'medium',
 owner text check (char_length(owner)<=120),
 public_summary text check (char_length(public_summary) between 10 and 1000),
 public_reviewed_at timestamptz,
 public_reviewed_by uuid references public.profiles(id) on delete set null,
 published boolean not null default false,
 resolution_note text check (char_length(resolution_note)<=2000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (not published or (public_summary is not null and public_reviewed_at is not null)),
 check (status <> 'resolved' or nullif(btrim(resolution_note),'') is not null)
);
create table public.submissions (
 id uuid primary key default gen_random_uuid(),
 reference text not null unique,
 tracking_hash text not null unique check (tracking_hash ~ '^[0-9a-f]{64}$'),
 role text not null check (role in ('student','teacher')),
 category public.feedback_category not null,
 description text not null check (char_length(btrim(description)) between 20 and 5000),
 faculty text check (char_length(faculty)<=120),
 locale text not null check (locale in ('ru','kk')),
 consent boolean not null check (consent=true),
 consent_version text not null default '2026-10-23',
 ai_consent boolean not null default false,
 issue_id uuid references public.issues(id) on delete set null,
 analysis jsonb,
 analysis_status text not null check (analysis_status in ('pending','completed','failed','skipped')),
 created_at timestamptz not null default now(),
 check (analysis is null or jsonb_typeof(analysis)='object'),
 check (ai_consent or (analysis is null and analysis_status='skipped'))
);
create table public.status_events (
 id uuid primary key default gen_random_uuid(),
 issue_id uuid not null references public.issues(id) on delete cascade,
 status public.issue_status not null,
 note text,
 actor uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now()
);
create table public.audit_events (
 id uuid primary key default gen_random_uuid(),
 actor uuid references public.profiles(id) on delete set null,
 action text not null,
 entity_id uuid not null,
 changed_fields text[] not null default '{}',
 created_at timestamptz not null default now()
);
create table public.submission_embeddings (
 submission_id uuid primary key references public.submissions(id) on delete cascade,
 embedding extensions.vector(1536) not null,
 created_at timestamptz not null default now()
);
create table public.rate_limits (
 key text not null,
 scope text not null,
 window_start timestamptz not null default now(),
 hits integer not null default 1 check(hits>0),
 primary key(key,scope)
);
create index submissions_issue_idx on public.submissions(issue_id);
create index submissions_created_idx on public.submissions(created_at desc,id);
create index submissions_category_idx on public.submissions(category,created_at desc);
create index submissions_pending_idx on public.submissions(analysis_status) where analysis_status in ('pending','failed');
create index issues_status_idx on public.issues(status,updated_at desc);
create index status_events_issue_idx on public.status_events(issue_id,created_at,id);
create index audit_events_entity_idx on public.audit_events(entity_id,created_at);
create index embeddings_cosine_idx on public.submission_embeddings using hnsw (embedding extensions.vector_cosine_ops);
create index rate_limits_expiry_idx on public.rate_limits(window_start);

-- Metadata can never assign a role. Provision admins using an operator's SQL
-- connection only, after creating the corresponding Supabase auth identity.
create function public.on_auth_user_created() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,role) values(new.id,'viewer') on conflict(id) do nothing;return new;end $$;
create trigger create_profile after insert on auth.users for each row execute function public.on_auth_user_created();
insert into public.profiles(id,role) select id,'viewer' from auth.users on conflict(id) do nothing;
create function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role in ('admin','moderator'));
$$;

alter table public.profiles enable row level security;
alter table public.issues enable row level security;
alter table public.submissions enable row level security;
alter table public.status_events enable row level security;
alter table public.audit_events enable row level security;
alter table public.submission_embeddings enable row level security;
alter table public.rate_limits enable row level security;
create policy profiles_read on public.profiles for select to authenticated using (id=auth.uid() or public.is_staff());
create policy issues_staff_read on public.issues for select to authenticated using (public.is_staff());
create policy submissions_staff_read on public.submissions for select to authenticated using (public.is_staff());
create policy status_staff_read on public.status_events for select to authenticated using (public.is_staff());
create policy audit_staff_read on public.audit_events for select to authenticated using (public.is_staff());
create policy embeddings_staff_read on public.submission_embeddings for select to authenticated using (public.is_staff());
-- Deliberately no public INSERT/UPDATE/DELETE policies, including profiles.
revoke all on public.profiles,public.issues,public.submissions,public.status_events,public.audit_events,public.submission_embeddings,public.rate_limits from anon,authenticated;
grant select on public.profiles,public.issues,public.submissions,public.status_events,public.audit_events,public.submission_embeddings to authenticated;
grant all on public.profiles,public.issues,public.submissions,public.status_events,public.audit_events,public.submission_embeddings,public.rate_limits to service_role;

create function public.audit_private_changes() returns trigger language plpgsql security definer set search_path=public as $$
declare actor_id uuid; fields text[];
begin
 actor_id:=nullif(current_setting('app.actor_id',true),'')::uuid;
 if tg_op='UPDATE' then select array_agg(n.key) into fields from jsonb_each(to_jsonb(new)) n where n.value is distinct from to_jsonb(old)->n.key;end if;
 insert into public.audit_events(actor,action,entity_id,changed_fields) values(actor_id,tg_table_name||'.'||lower(tg_op),case when tg_op='DELETE' then old.id else new.id end,coalesce(fields,'{}'));
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger audit_submissions after insert or update or delete on public.submissions for each row execute function public.audit_private_changes();
create trigger audit_issues after insert or update or delete on public.issues for each row execute function public.audit_private_changes();
create function public.issue_status_changed() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' or old.status is distinct from new.status then
  insert into public.status_events(issue_id,status,note,actor) values(new.id,new.status,new.resolution_note,nullif(current_setting('app.actor_id',true),'')::uuid);
 end if;return new;
end $$;
create trigger issue_status_event after insert or update on public.issues for each row execute function public.issue_status_changed();

-- All selected columns are an intentional privacy allow-list. Counts are live.
create function public.public_issues() returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'title',q.title,'titleKk',q.title_kk,'category',q.category,'status',q.status,'count',q.member_count,'publicSummary',q.public_summary,'updatedAt',q.updated_at) order by q.updated_at desc),'[]'::jsonb)
 from (select i.*,count(s.id) member_count from public.issues i join public.submissions s on s.issue_id=i.id
 where i.published and i.public_summary is not null and i.public_reviewed_at is not null group by i.id having count(s.id)>=3) q;
$$;
create function public.track_submission(p_hash text) returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('reference',s.reference,'category',s.category,'status',coalesce(i.status,'new'),'createdAt',s.created_at,
 'events',jsonb_build_array(jsonb_build_object('status','new','createdAt',s.created_at))||coalesce((select jsonb_agg(jsonb_build_object('status',e.status,'createdAt',e.created_at) order by e.created_at,e.id) from public.status_events e where e.issue_id=s.issue_id and e.created_at>=s.created_at),'[]'::jsonb))
 from public.submissions s left join public.issues i on i.id=s.issue_id where s.tracking_hash=p_hash;
$$;
create function public.consume_rate_limit(p_key text,p_scope text,p_limit integer,p_window_ms integer) returns boolean language plpgsql security definer set search_path=public as $$
declare allowed boolean;
begin
 if p_limit<1 or p_limit>10000 or p_window_ms<1000 or p_window_ms>86400000 or char_length(p_key)>128 or char_length(p_scope)>80 then raise exception 'invalid_input';end if;
 insert into public.rate_limits(key,scope,window_start,hits) values(p_key,p_scope,clock_timestamp(),1)
 on conflict(key,scope) do update set
 hits=case when rate_limits.window_start<=clock_timestamp()-make_interval(secs=>p_window_ms::double precision/1000) then 1 else rate_limits.hits+1 end,
 window_start=case when rate_limits.window_start<=clock_timestamp()-make_interval(secs=>p_window_ms::double precision/1000) then clock_timestamp() else rate_limits.window_start end
 where rate_limits.hits<p_limit or rate_limits.window_start<=clock_timestamp()-make_interval(secs=>p_window_ms::double precision/1000)
 returning true into allowed;
 return coalesce(allowed,false);
end $$;

-- Atomic issue and membership mutations. Only service_role can invoke this RPC;
-- p_actor is obtained by the server from auth.getUser + the server-granted role.
create function public.admin_action(p_action text,p_payload jsonb,p_actor uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare item public.issues; report public.submissions; target uuid; summary text;
begin
 if not exists(select 1 from public.profiles where id=p_actor and role in ('admin','moderator')) then raise exception 'forbidden';end if;
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

create function public.save_analysis(p_id uuid,p_analysis jsonb,p_status text,p_embedding text default null) returns void language plpgsql security definer set search_path=public,extensions as $$
declare allowed boolean;
begin
 select ai_consent into allowed from public.submissions where id=p_id for update;
 if not found then raise exception 'not_found';end if;
 if not allowed and (p_status<>'skipped' or p_analysis is not null or p_embedding is not null) then raise exception 'forbidden';end if;
 if p_status not in ('pending','completed','failed','skipped') then raise exception 'invalid_input';end if;
 if p_status='completed' and p_analysis is null then raise exception 'invalid_input';end if;
 update public.submissions set analysis=p_analysis,analysis_status=p_status where id=p_id;
 if p_embedding is not null then
  insert into public.submission_embeddings(submission_id,embedding) values(p_id,p_embedding::extensions.vector(1536)) on conflict(submission_id) do update set embedding=excluded.embedding,created_at=now();
 end if;
end $$;
create function public.match_issue_submissions(p_issue_id uuid,p_limit integer default 8) returns table(submission_id uuid,similarity double precision) language sql stable security definer set search_path=public,extensions as $$
 with centroid as (select avg(e.embedding)::extensions.vector(1536) value from public.submission_embeddings e join public.submissions s on s.id=e.submission_id where s.issue_id=p_issue_id)
 select e.submission_id,1-(e.embedding<=>c.value) as similarity from public.submission_embeddings e join public.submissions s on s.id=e.submission_id cross join centroid c
 where s.issue_id is null and s.ai_consent and c.value is not null and (1-(e.embedding<=>c.value))>=0.65
 order by e.embedding<=>c.value limit greatest(1,least(p_limit,20));
$$;
-- PostgreSQL functions are executable by PUBLIC by default: explicitly revoke
-- every sensitive function, not just its table privileges.
revoke all on function public.on_auth_user_created() from public,anon,authenticated;
revoke all on function public.audit_private_changes() from public,anon,authenticated;
revoke all on function public.issue_status_changed() from public,anon,authenticated;
revoke all on function public.is_staff() from public,anon,authenticated;
grant execute on function public.is_staff() to authenticated,service_role;
revoke all on function public.public_issues() from public,anon,authenticated;
grant execute on function public.public_issues() to anon,authenticated,service_role;
revoke all on function public.track_submission(text) from public,anon,authenticated;
revoke all on function public.consume_rate_limit(text,text,integer,integer) from public,anon,authenticated;
revoke all on function public.admin_action(text,jsonb,uuid) from public,anon,authenticated;
revoke all on function public.save_analysis(uuid,jsonb,text,text) from public,anon,authenticated;
revoke all on function public.match_issue_submissions(uuid,integer) from public,anon,authenticated;
grant execute on function public.track_submission(text),public.consume_rate_limit(text,text,integer,integer),public.admin_action(text,jsonb,uuid),public.save_analysis(uuid,jsonb,text,text),public.match_issue_submissions(uuid,integer) to service_role;
commit;
