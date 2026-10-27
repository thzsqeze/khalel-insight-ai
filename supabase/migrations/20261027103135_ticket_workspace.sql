-- Tickets extend existing submissions; public grouped issues keep their own workflow.
begin;
create table public.departments (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(btrim(name)) between 2 and 120),
 email text check (email is null or (char_length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
 active boolean not null default true,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);
create table public.tickets (
 id uuid primary key references public.submissions(id) on delete cascade,
 status public.issue_status not null default 'new',
 priority public.issue_priority not null default 'medium',
 department_id uuid references public.departments(id) on delete set null,
 assignee_id uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);
create table public.ticket_messages (
 id uuid primary key default gen_random_uuid(),
 ticket_id uuid not null references public.tickets(id) on delete cascade,
 kind text not null check(kind in ('reply','note','follow_up')),
 body text not null check(char_length(btrim(body)) between 1 and 5000),
 author_id uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default clock_timestamp(),
 check(kind<>'follow_up' or author_id is null)
);
create table public.ticket_events (
 id uuid primary key default gen_random_uuid(),
 ticket_id uuid not null references public.tickets(id) on delete cascade,
 action text not null,
 actor_id uuid references public.profiles(id) on delete set null,
 changes jsonb not null default '{}' check(jsonb_typeof(changes)='object'),
 created_at timestamptz not null default clock_timestamp()
);
create table public.ticket_email_deliveries (
 id uuid primary key,
 ticket_id uuid not null references public.tickets(id) on delete cascade,
 actor_id uuid references public.profiles(id) on delete set null,
 department_id uuid references public.departments(id) on delete set null,
 recipient text not null,
 status text not null default 'pending' check(status in ('pending','sent','failed')),
 provider_id text check(char_length(provider_id)<=200),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);
create index tickets_updated_idx on public.tickets(updated_at desc,id);
create index tickets_department_idx on public.tickets(department_id);
create index tickets_assignee_idx on public.tickets(assignee_id);
create index ticket_messages_ticket_idx on public.ticket_messages(ticket_id,created_at,id);
create index ticket_messages_author_idx on public.ticket_messages(author_id);
create index ticket_events_ticket_idx on public.ticket_events(ticket_id,created_at,id);
create index ticket_events_actor_idx on public.ticket_events(actor_id);
create index ticket_email_ticket_idx on public.ticket_email_deliveries(ticket_id,created_at);
create index ticket_email_actor_idx on public.ticket_email_deliveries(actor_id);
create index ticket_email_department_idx on public.ticket_email_deliveries(department_id);

alter table public.departments enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.ticket_events enable row level security;
alter table public.ticket_email_deliveries enable row level security;
-- These tables have no direct public/authenticated policies. Reads and writes are
-- mediated by the server. Invoker RPCs below require the service-role grant.
revoke all on public.departments,public.tickets,public.ticket_messages,public.ticket_events,public.ticket_email_deliveries from public,anon,authenticated;
grant all on public.departments,public.tickets,public.ticket_messages,public.ticket_events,public.ticket_email_deliveries to service_role;

insert into public.tickets(id,status,priority,created_at,updated_at)
 select s.id,coalesce(i.status,'new'),coalesce(i.priority,'medium'),s.created_at,greatest(s.created_at,coalesce(i.updated_at,s.created_at))
 from public.submissions s left join public.issues i on i.id=s.issue_id;
insert into public.ticket_events(ticket_id,action,changes,created_at)
 select id,'created',jsonb_build_object('status',status),created_at from public.tickets;

create function public.create_submission_ticket() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.tickets(id,created_at,updated_at) values(new.id,new.created_at,new.created_at);
 insert into public.ticket_events(ticket_id,action,changes,created_at) values(new.id,'created','{"status":"new"}',new.created_at);
 return new;
end $$;
create trigger create_ticket after insert on public.submissions for each row execute function public.create_submission_ticket();

-- Locking the actor row makes revocation and the action serialize. The actor ID
-- always comes from the server's freshly authenticated session, never the body.
create function public.ticket_require_staff(p_actor uuid,p_owner boolean default false) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.profiles where id=p_actor and
  (case when p_owner then role='admin' and is_owner else role in ('owner','admin','moderator') end) for share;
 if not found then raise exception 'forbidden';end if;
end $$;
create function public.ticket_json(p_submission public.submissions,p_ticket public.tickets) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',p_submission.id,'reference',p_submission.reference,'role',p_submission.role,'category',p_submission.category,
 'description',p_submission.description,'faculty',p_submission.faculty,'locale',p_submission.locale,'aiConsent',p_submission.ai_consent,
 'createdAt',p_submission.created_at,'issueId',p_submission.issue_id,'analysis',p_submission.analysis,'analysisStatus',p_submission.analysis_status,
 'status',p_ticket.status,'priority',p_ticket.priority,'departmentId',p_ticket.department_id,'assigneeId',p_ticket.assignee_id,'updatedAt',p_ticket.updated_at);
$$;
create function public.department_list(p_actor uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 perform public.ticket_require_staff(p_actor);
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'email',email,'active',active) order by name,id),'[]') into result from public.departments;
 return result;
end $$;
create function public.ticket_read(p_actor uuid,p_id uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 perform public.ticket_require_staff(p_actor);
 if p_id is null then
  select jsonb_build_object('tickets',coalesce(jsonb_agg(public.ticket_json(s,t) order by t.updated_at desc,t.id),'[]'),'departments',public.department_list(p_actor)) into result
  from public.tickets t join public.submissions s on s.id=t.id;
 else
  select jsonb_build_object('ticket',public.ticket_json(s,t),
   'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'kind',m.kind,'body',m.body,'authorId',m.author_id,'createdAt',m.created_at) order by m.created_at,m.id) from public.ticket_messages m where m.ticket_id=t.id),'[]'),
   'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'action',e.action,'actorId',e.actor_id,'changes',e.changes,'createdAt',e.created_at) order by e.created_at,e.id) from public.ticket_events e where e.ticket_id=t.id),'[]')) into result
  from public.tickets t join public.submissions s on s.id=t.id where t.id=p_id;
 end if;
 return result;
end $$;

create function public.ticket_action(p_action text,p_id uuid,p_payload jsonb,p_actor uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare item public.tickets; previous public.tickets; message_id uuid; kind text; body text; assigned uuid;
begin
 perform public.ticket_require_staff(p_actor);
 if p_id is null or p_payload is null or jsonb_typeof(p_payload)<>'object' then raise exception 'invalid_input';end if;
 select * into item from public.tickets where id=p_id for update;
 if not found then raise exception 'not_found';end if;
 previous:=item;
 if p_action='patch' then
  if p_payload='{}'::jsonb or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('status','priority','departmentId','assigneeId')) then raise exception 'invalid_input';end if;
  if p_payload?'status' then
   if jsonb_typeof(p_payload->'status')<>'string' then raise exception 'invalid_input';end if;
   item.status:=(p_payload->>'status')::public.issue_status;
  end if;
  if p_payload?'priority' then
   if jsonb_typeof(p_payload->'priority')<>'string' then raise exception 'invalid_input';end if;
   item.priority:=(p_payload->>'priority')::public.issue_priority;
  end if;
  if p_payload?'departmentId' then
   if jsonb_typeof(p_payload->'departmentId') not in ('string','null') then raise exception 'invalid_input';end if;
   assigned:=(p_payload->>'departmentId')::uuid;
   if assigned is not null then
    perform 1 from public.departments where id=assigned and active for share;
    if not found then raise exception 'invalid_input';end if;
   end if;
   item.department_id:=assigned;
  end if;
  if p_payload?'assigneeId' then
   if jsonb_typeof(p_payload->'assigneeId') not in ('string','null') then raise exception 'invalid_input';end if;
   assigned:=(p_payload->>'assigneeId')::uuid;
   if assigned is not null then
    perform 1 from public.profiles where id=assigned and role in ('owner','admin','moderator') for share;
    if not found then raise exception 'invalid_input';end if;
   end if;
   item.assignee_id:=assigned;
  end if;
  if item.status is distinct from previous.status then insert into public.ticket_events(ticket_id,action,actor_id,changes) values(p_id,'status_changed',p_actor,jsonb_build_object('from',previous.status,'to',item.status));end if;
  if item.priority is distinct from previous.priority then insert into public.ticket_events(ticket_id,action,actor_id,changes) values(p_id,'priority_changed',p_actor,jsonb_build_object('from',previous.priority,'to',item.priority));end if;
  if item.department_id is distinct from previous.department_id then insert into public.ticket_events(ticket_id,action,actor_id,changes) values(p_id,'department_changed',p_actor,jsonb_build_object('from',previous.department_id,'to',item.department_id));end if;
  if item.assignee_id is distinct from previous.assignee_id then insert into public.ticket_events(ticket_id,action,actor_id,changes) values(p_id,'assignee_changed',p_actor,jsonb_build_object('from',previous.assignee_id,'to',item.assignee_id));end if;
  update public.tickets set status=item.status,priority=item.priority,department_id=item.department_id,assignee_id=item.assignee_id,updated_at=clock_timestamp() where id=p_id;
  insert into public.audit_events(actor,action,entity_id,changed_fields) values(p_actor,'ticket.patch',p_id,array(select jsonb_object_keys(p_payload)));
  return p_id;
 elsif p_action='message' then
  if exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('kind','body')) or jsonb_typeof(p_payload->'body') is distinct from 'string' or jsonb_typeof(p_payload->'kind') is distinct from 'string' then raise exception 'invalid_input';end if;
  kind:=p_payload->>'kind';body:=btrim(p_payload->>'body');
  if kind not in ('reply','note') or char_length(body) not between 1 and 5000 then raise exception 'invalid_input';end if;
  insert into public.ticket_messages(ticket_id,kind,body,author_id) values(p_id,kind,body,p_actor) returning id into message_id;
  insert into public.ticket_events(ticket_id,action,actor_id) values(p_id,kind||'_added',p_actor);
  update public.tickets set updated_at=clock_timestamp() where id=p_id;
  return message_id;
 end if;
 raise exception 'invalid_input';
exception when invalid_text_representation or not_null_violation or check_violation then raise exception 'invalid_input';
end $$;

-- Replaces the existing service-only tracking RPC with an explicit public
-- projection. No assignments, notes, actor IDs or department emails are returned.
create or replace function public.track_submission(p_hash text) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('reference',s.reference,'category',s.category,'status',t.status,'createdAt',s.created_at,
 'events',coalesce((select jsonb_agg(jsonb_build_object('status',case when e.action='created' then e.changes->>'status' else e.changes->>'to' end,'createdAt',e.created_at) order by e.created_at,e.id) from public.ticket_events e where e.ticket_id=t.id and e.action in ('created','status_changed')),'[]'),
 'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'kind',m.kind,'body',m.body,'createdAt',m.created_at) order by m.created_at,m.id) from public.ticket_messages m where m.ticket_id=t.id and m.kind in ('reply','follow_up')),'[]'))
 from public.submissions s join public.tickets t on t.id=s.id where p_hash ~ '^[0-9a-f]{64}$' and s.tracking_hash=p_hash;
$$;
create function public.ticket_follow_up(p_hash text,p_body text) returns uuid language plpgsql security invoker set search_path='' as $$
declare item public.tickets; message_id uuid;
begin
 if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' or p_body is null or char_length(btrim(p_body)) not between 1 and 5000 then raise exception 'invalid_input';end if;
 select t.* into item from public.tickets t join public.submissions s on s.id=t.id where s.tracking_hash=p_hash for update of t;
 if not found then raise exception 'not_found';end if;
 insert into public.ticket_messages(ticket_id,kind,body) values(item.id,'follow_up',btrim(p_body)) returning id into message_id;
 insert into public.ticket_events(ticket_id,action) values(item.id,'follow_up_added');
 if item.status='resolved' then
  insert into public.ticket_events(ticket_id,action,changes) values(item.id,'status_changed',jsonb_build_object('from','resolved','to','under_review'));
 end if;
 update public.tickets set status=case when status='resolved' then 'under_review'::public.issue_status else status end,updated_at=clock_timestamp() where id=item.id;
 return message_id;
end $$;

create function public.department_action(p_action text,p_id uuid,p_payload jsonb,p_actor uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare item public.departments; target uuid;
begin
 perform public.ticket_require_staff(p_actor,true);
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or p_payload='{}'::jsonb or exists(select 1 from jsonb_object_keys(p_payload) k where k not in ('name','email','active')) then raise exception 'invalid_input';end if;
 if p_payload?'name' and (jsonb_typeof(p_payload->'name')<>'string' or char_length(btrim(p_payload->>'name')) not between 2 and 120) then raise exception 'invalid_input';end if;
 if p_payload?'email' and jsonb_typeof(p_payload->'email') not in ('string','null') then raise exception 'invalid_input';end if;
 if p_payload?'active' and jsonb_typeof(p_payload->'active')<>'boolean' then raise exception 'invalid_input';end if;
 if p_action='create' then
  if not p_payload?'name' or not p_payload?'email' or p_payload?'active' then raise exception 'invalid_input';end if;
  insert into public.departments(name,email) values(btrim(p_payload->>'name'),p_payload->>'email') returning id into target;
 elsif p_action='patch' then
  select * into item from public.departments where id=p_id for update;
  if not found then raise exception 'not_found';end if;
  if p_payload?'name' then item.name:=btrim(p_payload->>'name');end if;
  if p_payload?'email' then item.email:=p_payload->>'email';end if;
  if p_payload?'active' then item.active:=(p_payload->>'active')::boolean;end if;
  update public.departments set name=item.name,email=item.email,active=item.active,updated_at=clock_timestamp() where id=p_id;
  target:=p_id;
 else raise exception 'invalid_input';end if;
 insert into public.audit_events(actor,action,entity_id,changed_fields) values(p_actor,'department.'||p_action,target,array(select jsonb_object_keys(p_payload)));
 return target;
exception when invalid_text_representation or not_null_violation or check_violation then raise exception 'invalid_input';
end $$;

create function public.reserve_ticket_email(p_ticket_id uuid,p_actor uuid,p_request_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare item public.tickets; department public.departments; delivery public.ticket_email_deliveries; reference text; should_send boolean:=false;
begin
 perform public.ticket_require_staff(p_actor);
 if p_ticket_id is null or p_request_id is null then raise exception 'invalid_input';end if;
 select * into item from public.tickets where id=p_ticket_id for update;
 if not found then raise exception 'not_found';end if;
 select * into delivery from public.ticket_email_deliveries where id=p_request_id for update;
 if found then
  if delivery.ticket_id<>p_ticket_id or delivery.actor_id is distinct from p_actor then raise exception 'invalid_input';end if;
 else
  select * into department from public.departments where id=item.department_id and active for share;
  if not found or department.email is null then raise exception 'department_email_required';end if;
  insert into public.ticket_email_deliveries(id,ticket_id,actor_id,department_id,recipient) values(p_request_id,p_ticket_id,p_actor,department.id,department.email) returning * into delivery;
  should_send:=true;
 end if;
 select s.reference into reference from public.submissions s where s.id=p_ticket_id;
 return jsonb_build_object('id',delivery.id,'recipient',delivery.recipient,'reference',reference,'status',delivery.status,'createdAt',delivery.created_at,'shouldSend',should_send);
exception when unique_violation then raise exception 'invalid_input';
end $$;
create function public.finalize_ticket_email(p_id uuid,p_actor uuid,p_status text,p_provider_id text default null) returns void language plpgsql security invoker set search_path='' as $$
declare delivery public.ticket_email_deliveries;
begin
 perform public.ticket_require_staff(p_actor);
 if p_status is null or p_status not in ('sent','failed') or char_length(p_provider_id)>200 then raise exception 'invalid_input';end if;
 -- Use the same ticket-before-delivery lock order as reserve_ticket_email.
 select * into delivery from public.ticket_email_deliveries where id=p_id;
 if not found then raise exception 'not_found';end if;
 perform 1 from public.tickets where id=delivery.ticket_id for update;
 select * into delivery from public.ticket_email_deliveries where id=p_id for update;
 if not found then raise exception 'not_found';end if;
 if delivery.actor_id is distinct from p_actor then raise exception 'forbidden';end if;
 if delivery.status<>'pending' then
  if delivery.status=p_status then return;end if;
  raise exception 'invalid_input';
 end if;
 update public.ticket_email_deliveries set status=p_status,provider_id=p_provider_id,updated_at=clock_timestamp() where id=p_id;
 insert into public.ticket_events(ticket_id,action,actor_id,changes) values(delivery.ticket_id,'email_'||p_status,p_actor,jsonb_build_object('departmentId',delivery.department_id));
 insert into public.audit_events(actor,action,entity_id,changed_fields) values(p_actor,'ticket.email_'||p_status,delivery.ticket_id,array['status']);
end $$;

revoke all on function public.create_submission_ticket(),public.ticket_require_staff(uuid,boolean),public.ticket_json(public.submissions,public.tickets),public.department_list(uuid),public.ticket_read(uuid,uuid),public.ticket_action(text,uuid,jsonb,uuid),public.track_submission(text),public.ticket_follow_up(text,text),public.department_action(text,uuid,jsonb,uuid),public.reserve_ticket_email(uuid,uuid,uuid),public.finalize_ticket_email(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.create_submission_ticket(),public.ticket_require_staff(uuid,boolean),public.ticket_json(public.submissions,public.tickets),public.department_list(uuid),public.ticket_read(uuid,uuid),public.ticket_action(text,uuid,jsonb,uuid),public.track_submission(text),public.ticket_follow_up(text,text),public.department_action(text,uuid,jsonb,uuid),public.reserve_ticket_email(uuid,uuid,uuid),public.finalize_ticket_email(uuid,uuid,text,text) to service_role;
commit;
