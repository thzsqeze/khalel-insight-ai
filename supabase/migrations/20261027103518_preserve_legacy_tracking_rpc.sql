-- Keep the currently deployed app compatible while the ticket workspace rolls out.
-- Existing clients call track_submission and still expect grouped-issue status.
-- The new app uses a separate service-only ticket tracking RPC.
begin;
create function public.track_ticket_submission(p_hash text) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('reference',s.reference,'category',s.category,'status',t.status,'createdAt',s.created_at,
 'events',coalesce((select jsonb_agg(jsonb_build_object('status',case when e.action='created' then e.changes->>'status' else e.changes->>'to' end,'createdAt',e.created_at) order by e.created_at,e.id) from public.ticket_events e where e.ticket_id=t.id and e.action in ('created','status_changed')),'[]'),
 'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'kind',m.kind,'body',m.body,'createdAt',m.created_at) order by m.created_at,m.id) from public.ticket_messages m where m.ticket_id=t.id and m.kind in ('reply','follow_up')),'[]'))
 from public.submissions s join public.tickets t on t.id=s.id where p_hash ~ '^[0-9a-f]{64}$' and s.tracking_hash=p_hash;
$$;

create or replace function public.track_submission(p_hash text) returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('reference',s.reference,'category',s.category,'status',coalesce(i.status,'new'),'createdAt',s.created_at,
 'events',jsonb_build_array(jsonb_build_object('status','new','createdAt',s.created_at))||coalesce((select jsonb_agg(jsonb_build_object('status',e.status,'createdAt',e.created_at) order by e.created_at,e.id) from public.status_events e where e.issue_id=s.issue_id and e.created_at>=s.created_at),'[]'::jsonb))
 from public.submissions s left join public.issues i on i.id=s.issue_id where s.tracking_hash=p_hash;
$$;

revoke all on function public.track_submission(text),public.track_ticket_submission(text) from public,anon,authenticated;
grant execute on function public.track_submission(text),public.track_ticket_submission(text) to service_role;
commit;
