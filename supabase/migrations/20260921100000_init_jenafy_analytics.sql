-- Jenafy Analytics schema

create extension if not exists pgcrypto;

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.global_role as enum ('owner', 'client');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.member_role as enum ('owner', 'client');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.device_kind as enum ('desktop', 'mobile', 'tablet');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  global_role public.global_role not null default 'client',
  created_at timestamptz not null default now()
);

create index profiles_global_role_idx on public.profiles (global_role);

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned public.global_role := 'client';
begin
  if not exists (select 1 from public.profiles where global_role = 'owner') then
    assigned := 'owner';
  end if;

  insert into public.profiles (id, email, global_role)
  values (new.id, coalesce(new.email, ''), assigned)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Websites
-- ---------------------------------------------------------------------------
create table public.websites (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  name text not null,
  domain text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.website_members (
  website_id uuid not null references public.websites (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'client',
  created_at timestamptz not null default now(),
  primary key (website_id, user_id)
);

create index website_members_user_idx on public.website_members (user_id);

create or replace function private.generate_public_id()
returns text
language sql
security definer
set search_path = public, private
as $$
  select 'jn_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
$$;

create or replace function private.websites_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.public_id is null or new.public_id = '' then
    new.public_id := private.generate_public_id();
  end if;
  new.domain := lower(regexp_replace(new.domain, '^https?://', ''));
  new.domain := regexp_replace(new.domain, '/.*$', '');
  new.domain := regexp_replace(new.domain, '^www\.', '');
  return new;
end;
$$;

drop trigger if exists websites_before_insert on public.websites;
create trigger websites_before_insert
  before insert on public.websites
  for each row execute function private.websites_before_insert();

create or replace function private.websites_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.website_members (website_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists websites_after_insert on public.websites;
create trigger websites_after_insert
  after insert on public.websites
  for each row execute function private.websites_after_insert();

-- ---------------------------------------------------------------------------
-- Analytics tables
-- ---------------------------------------------------------------------------
create table public.visitors (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites (id) on delete cascade,
  visitor_token text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (website_id, visitor_token)
);

create table public.sessions (
  id uuid primary key,
  website_id uuid not null references public.websites (id) on delete cascade,
  visitor_id uuid not null references public.visitors (id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  landing_path text,
  exit_path text,
  pageview_count integer not null default 0
);

create index sessions_website_started_idx on public.sessions (website_id, started_at);
create index sessions_visitor_idx on public.sessions (visitor_id);

create table public.pageviews (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites (id) on delete cascade,
  visitor_id uuid not null references public.visitors (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  path text not null,
  title text,
  href text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  source_category text not null default 'direct',
  device_type public.device_kind not null default 'desktop',
  browser text,
  os text,
  screen_w integer,
  screen_h integer,
  viewport_w integer,
  viewport_h integer,
  language text,
  country text,
  is_entrance boolean not null default false,
  time_on_page_ms integer
);

create index pageviews_website_time_idx on public.pageviews (website_id, occurred_at desc);
create index pageviews_website_path_idx on public.pageviews (website_id, path);
create index pageviews_session_idx on public.pageviews (session_id, occurred_at);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites (id) on delete cascade,
  visitor_id uuid not null references public.visitors (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  name text not null,
  path text
);

create index events_website_time_idx on public.events (website_id, occurred_at desc);
create index events_website_name_idx on public.events (website_id, name);

create table public.heatmap_clicks (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  path text not null,
  device_type public.device_kind not null default 'desktop',
  x_rel real not null,
  y_rel real not null,
  viewport_w integer,
  viewport_h integer,
  scroll_y integer
);

create index heatmap_clicks_lookup_idx
  on public.heatmap_clicks (website_id, path, device_type, occurred_at desc);

create table public.heatmap_moves (
  website_id uuid not null references public.websites (id) on delete cascade,
  day date not null,
  path text not null,
  device_type public.device_kind not null default 'desktop',
  gx smallint not null,
  gy smallint not null,
  hits integer not null default 0,
  primary key (website_id, day, path, device_type, gx, gy)
);

create table public.heatmap_scrolls (
  website_id uuid not null references public.websites (id) on delete cascade,
  session_id uuid not null,
  path text not null,
  device_type public.device_kind not null default 'desktop',
  depth smallint not null,
  occurred_at timestamptz not null default now(),
  primary key (session_id, path, depth)
);

create index heatmap_scrolls_lookup_idx
  on public.heatmap_scrolls (website_id, path, device_type, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Auth helpers (security definer to avoid RLS recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and global_role = 'owner'
  );
$$;

create or replace function public.has_website_access(p_website_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_owner()
    or exists (
      select 1 from public.website_members
      where website_id = p_website_id and user_id = auth.uid()
    );
$$;

revoke all on function public.is_owner() from public;
revoke all on function public.has_website_access(uuid) from public;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.has_website_access(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Ingest
-- ---------------------------------------------------------------------------
create or replace function public.classify_source(p_referrer text, p_href text, p_domain text)
returns text
language plpgsql
immutable
as $$
declare
  utm_medium text;
  utm_source text;
  host text;
begin
  utm_medium := lower(coalesce(substring(coalesce(p_href, '') from 'utm_medium=([^&]+)' ), ''));
  utm_source := lower(coalesce(substring(coalesce(p_href, '') from 'utm_source=([^&]+)' ), ''));
  host := lower(coalesce(substring(coalesce(p_referrer, '') from 'https?://([^/]+)'), ''));
  host := regexp_replace(host, '^www\.', '');

  if utm_medium in ('social', 'social-media') or utm_source in (
    'facebook', 'instagram', 'twitter', 'x', 'linkedin', 'tiktok', 'pinterest', 'youtube', 'reddit'
  ) then
    return 'social';
  end if;

  if utm_medium in ('organic', 'cpc', 'ppc', 'seo', 'sem') then
    return 'organic';
  end if;

  if host = '' or host = lower(coalesce(p_domain, '')) then
    return 'direct';
  end if;

  if host in (
    'google.com', 'google.co.uk', 'google.ca', 'google.com.au', 'google.co.nz',
    'bing.com', 'yahoo.com', 'duckduckgo.com', 'baidu.com', 'yandex.com', 'search.brave.com'
  ) or host like '%.google.com' then
    return 'organic';
  end if;

  if host in (
    'facebook.com', 'l.facebook.com', 'm.facebook.com', 'instagram.com', 'l.instagram.com',
    'twitter.com', 'x.com', 't.co', 'linkedin.com', 'lnkd.in', 'tiktok.com',
    'pinterest.com', 'reddit.com', 'youtube.com', 'youtu.be'
  ) or host like '%.facebook.com' or host like '%.linkedin.com' then
    return 'social';
  end if;

  return 'referral';
end;
$$;

create or replace function public.ingest_analytics(
  p_site_id text,
  p_payload jsonb,
  p_country text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_website public.websites%rowtype;
  v_visitor_token text;
  v_session_id uuid;
  v_visitor_id uuid;
  v_event jsonb;
  v_type text;
  v_path text;
  v_name text;
  v_device public.device_kind;
  v_now timestamptz;
  v_prev_id uuid;
  v_prev_at timestamptz;
  v_cell text;
  v_gx int;
  v_gy int;
  v_count int := 0;
  v_is_entrance boolean;
begin
  if p_site_id is null or p_payload is null then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select * into v_website from public.websites where public_id = p_site_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'unknown_site');
  end if;

  v_visitor_token := left(coalesce(p_payload->>'visitorId', ''), 80);
  begin
    v_session_id := (p_payload->>'sessionId')::uuid;
  exception when others then
    v_session_id := null;
  end;

  if v_visitor_token = '' or v_session_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_ids');
  end if;

  insert into public.visitors (website_id, visitor_token)
  values (v_website.id, v_visitor_token)
  on conflict (website_id, visitor_token)
  do update set last_seen_at = now()
  returning id into v_visitor_id;

  insert into public.sessions (id, website_id, visitor_id)
  values (v_session_id, v_website.id, v_visitor_id)
  on conflict (id) do update
    set last_seen_at = now()
  where public.sessions.website_id = v_website.id;

  if not exists (
    select 1 from public.sessions s
    where s.id = v_session_id and s.website_id = v_website.id
  ) then
    return jsonb_build_object('ok', false, 'error', 'session_mismatch');
  end if;

  for v_event in
    select value from jsonb_array_elements(coalesce(p_payload->'events', '[]'::jsonb))
  loop
    v_count := v_count + 1;
    exit when v_count > 60;

    v_type := v_event->>'t';
    if coalesce(v_event->>'ts', '') ~ '^[0-9]+$' then
      v_now := to_timestamp((v_event->>'ts')::bigint / 1000.0);
    else
      v_now := coalesce((v_event->>'ts')::timestamptz, now());
    end if;
    v_path := left(coalesce(v_event->>'path', '/'), 500);

    begin
      v_device := coalesce(v_event->>'device', 'desktop')::public.device_kind;
    exception when others then
      v_device := 'desktop';
    end;

    if v_type = 'pv' then
      select pv.id, pv.occurred_at
        into v_prev_id, v_prev_at
      from public.pageviews pv
      where pv.session_id = v_session_id
      order by pv.occurred_at desc
      limit 1;

      if v_prev_id is not null and v_prev_at < v_now then
        update public.pageviews
          set time_on_page_ms = greatest(0, least(1800000, floor(extract(epoch from (v_now - v_prev_at)) * 1000)::int))
        where id = v_prev_id and time_on_page_ms is null;
      end if;

      select pageview_count = 0 into v_is_entrance
      from public.sessions where id = v_session_id;

      insert into public.pageviews (
        website_id, visitor_id, session_id, occurred_at, path, title, href, referrer,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content, source_category,
        device_type, browser, os, screen_w, screen_h, viewport_w, viewport_h, language,
        country, is_entrance
      ) values (
        v_website.id,
        v_visitor_id,
        v_session_id,
        v_now,
        v_path,
        left(v_event->>'title', 300),
        left(v_event->>'href', 1000),
        left(v_event->>'ref', 1000),
        left(v_event->'utm'->>'source', 120),
        left(v_event->'utm'->>'medium', 120),
        left(v_event->'utm'->>'campaign', 180),
        left(v_event->'utm'->>'term', 180),
        left(v_event->'utm'->>'content', 180),
        public.classify_source(v_event->>'ref', v_event->>'href', v_website.domain),
        v_device,
        left(v_event->>'browser', 60),
        left(v_event->>'os', 60),
        nullif(v_event->>'sw', '')::int,
        nullif(v_event->>'sh', '')::int,
        nullif(v_event->>'vw', '')::int,
        nullif(v_event->>'vh', '')::int,
        left(v_event->>'lang', 20),
        left(nullif(p_country, ''), 8),
        coalesce(v_is_entrance, false)
      );

      update public.sessions
      set
        last_seen_at = v_now,
        pageview_count = pageview_count + 1,
        landing_path = coalesce(landing_path, v_path),
        exit_path = v_path
      where id = v_session_id;

    elsif v_type = 'ev' then
      v_name := lower(left(coalesce(v_event->>'name', ''), 64));
      if v_name ~ '^[a-z][a-z0-9_.:-]{0,63}$' then
        insert into public.events (website_id, visitor_id, session_id, occurred_at, name, path)
        values (v_website.id, v_visitor_id, v_session_id, v_now, v_name, v_path);
        update public.sessions set last_seen_at = v_now where id = v_session_id;
      end if;

    elsif v_type = 'ck' then
      insert into public.heatmap_clicks (
        website_id, occurred_at, path, device_type, x_rel, y_rel, viewport_w, viewport_h, scroll_y
      ) values (
        v_website.id,
        v_now,
        v_path,
        v_device,
        least(1, greatest(0, coalesce((v_event->>'x')::real, 0))),
        least(5, greatest(0, coalesce((v_event->>'y')::real, 0))),
        nullif(v_event->>'vw', '')::int,
        nullif(v_event->>'vh', '')::int,
        coalesce(nullif(v_event->>'sy', '')::int, 0)
      );

    elsif v_type = 'sc' then
      insert into public.heatmap_scrolls (website_id, session_id, path, device_type, depth, occurred_at)
      values (
        v_website.id,
        v_session_id,
        v_path,
        v_device,
        coalesce(nullif(v_event->>'depth', '')::smallint, 0),
        v_now
      )
      on conflict do nothing;

    elsif v_type = 'mv' then
      for v_cell in select jsonb_array_elements_text(coalesce(v_event->'cells', '[]'::jsonb))
      loop
        v_gx := split_part(v_cell, ',', 1)::int;
        v_gy := split_part(v_cell, ',', 2)::int;
        if v_gx between 0 and 39 and v_gy between 0 and 29 then
          insert into public.heatmap_moves (website_id, day, path, device_type, gx, gy, hits)
          values (v_website.id, v_now::date, v_path, v_device, v_gx, v_gy, 1)
          on conflict (website_id, day, path, device_type, gx, gy)
          do update set hits = public.heatmap_moves.hits + 1;
        end if;
      end loop;

    elsif v_type = 'hb' then
      update public.sessions set last_seen_at = v_now where id = v_session_id;
    end if;
  end loop;

  update public.visitors set last_seen_at = now() where id = v_visitor_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.ingest_analytics(text, jsonb, text) from public;
grant execute on function public.ingest_analytics(text, jsonb, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Dashboard RPCs
-- ---------------------------------------------------------------------------
create or replace function public.analytics_overview(
  p_website_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  result jsonb;
  prev_from timestamptz;
  prev_to timestamptz;
begin
  if not public.has_website_access(p_website_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  prev_to := p_from;
  prev_from := p_from - (p_to - p_from);

  with cur as (
    select
      count(*)::int as pageviews,
      count(distinct visitor_id)::int as visitors,
      count(distinct session_id)::int as sessions
    from public.pageviews
    where website_id = p_website_id
      and occurred_at >= p_from
      and occurred_at < p_to
  ),
  sess as (
    select
      coalesce(avg(extract(epoch from (last_seen_at - started_at))), 0)::int as avg_duration
    from public.sessions
    where website_id = p_website_id
      and started_at >= p_from
      and started_at < p_to
  ),
  prv as (
    select
      count(*)::int as pageviews,
      count(distinct visitor_id)::int as visitors,
      count(distinct session_id)::int as sessions
    from public.pageviews
    where website_id = p_website_id
      and occurred_at >= prev_from
      and occurred_at < prev_to
  ),
  psess as (
    select
      coalesce(avg(extract(epoch from (last_seen_at - started_at))), 0)::int as avg_duration
    from public.sessions
    where website_id = p_website_id
      and started_at >= prev_from
      and started_at < prev_to
  )
  select jsonb_build_object(
    'visitors', cur.visitors,
    'sessions', cur.sessions,
    'pageviews', cur.pageviews,
    'pages_per_session', case when cur.sessions = 0 then 0 else round(cur.pageviews::numeric / cur.sessions, 2) end,
    'avg_session_duration', sess.avg_duration,
    'previous', jsonb_build_object(
      'visitors', prv.visitors,
      'sessions', prv.sessions,
      'pageviews', prv.pageviews,
      'pages_per_session', case when prv.sessions = 0 then 0 else round(prv.pageviews::numeric / prv.sessions, 2) end,
      'avg_session_duration', psess.avg_duration
    )
  ) into result
  from cur, sess, prv, psess;

  return result;
end;
$$;

create or replace function public.analytics_timeseries(
  p_website_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (bucket_day date, visitors int, sessions int, pageviews int)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.has_website_access(p_website_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  with days as (
    select generate_series(p_from::date, (p_to - interval '1 second')::date, interval '1 day')::date as day
  )
  select
    d.day as bucket_day,
    coalesce(count(distinct pv.visitor_id), 0)::int as visitors,
    coalesce(count(distinct pv.session_id), 0)::int as sessions,
    coalesce(count(pv.id), 0)::int as pageviews
  from days d
  left join public.pageviews pv
    on pv.website_id = p_website_id
   and pv.occurred_at >= d.day
   and pv.occurred_at < d.day + 1
  group by d.day
  order by d.day;
end;
$$;

create or replace function public.analytics_pages(
  p_website_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  page_path text,
  views int,
  visitors int,
  entrances int,
  exits int,
  avg_time_ms int
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.has_website_access(p_website_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select
    pv.path as page_path,
    count(*)::int as views,
    count(distinct pv.visitor_id)::int as visitors,
    count(*) filter (where pv.is_entrance)::int as entrances,
    count(*) filter (
      where exists (
        select 1 from public.sessions s
        where s.id = pv.session_id
          and s.exit_path = pv.path
          and s.started_at >= p_from
          and s.started_at < p_to
      )
    )::int as exits,
    coalesce(avg(pv.time_on_page_ms) filter (where pv.time_on_page_ms is not null), 0)::int as avg_time_ms
  from public.pageviews pv
  where pv.website_id = p_website_id
    and pv.occurred_at >= p_from
    and pv.occurred_at < p_to
  group by pv.path;
end;
$$;

create or replace function public.analytics_sources(
  p_website_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.has_website_access(p_website_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'categories', (
      select coalesce(jsonb_agg(jsonb_build_object('category', q.source_category, 'visitors', q.visitors, 'pageviews', q.pageviews) order by q.pageviews desc), '[]'::jsonb)
      from (
        select source_category, count(distinct visitor_id)::int as visitors, count(*)::int as pageviews
        from public.pageviews
        where website_id = p_website_id and occurred_at >= p_from and occurred_at < p_to
        group by source_category
      ) q
    ),
    'campaigns', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'source', q.utm_source,
        'medium', q.utm_medium,
        'campaign', q.utm_campaign,
        'visitors', q.visitors,
        'pageviews', q.pageviews
      ) order by q.pageviews desc), '[]'::jsonb)
      from (
        select utm_source, utm_medium, utm_campaign,
          count(distinct visitor_id)::int as visitors, count(*)::int as pageviews
        from public.pageviews
        where website_id = p_website_id
          and occurred_at >= p_from and occurred_at < p_to
          and utm_source is not null
        group by utm_source, utm_medium, utm_campaign
        limit 50
      ) q
    ),
    'referrers', (
      select coalesce(jsonb_agg(jsonb_build_object('referrer', q.host, 'visitors', q.visitors, 'pageviews', q.pageviews) order by q.pageviews desc), '[]'::jsonb)
      from (
        select
          regexp_replace(substring(coalesce(referrer, '') from 'https?://([^/]+)'), '^www\.', '') as host,
          count(distinct visitor_id)::int as visitors,
          count(*)::int as pageviews
        from public.pageviews
        where website_id = p_website_id
          and occurred_at >= p_from and occurred_at < p_to
          and referrer is not null and referrer <> ''
        group by 1
        having regexp_replace(substring(coalesce(referrer, '') from 'https?://([^/]+)'), '^www\.', '') <> ''
        order by count(*) desc
        limit 30
      ) q
    )
  );
end;
$$;

create or replace function public.analytics_devices(
  p_website_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.has_website_access(p_website_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'devices', (
      select coalesce(jsonb_agg(jsonb_build_object('device', q.device_type, 'visitors', q.visitors, 'pageviews', q.pageviews)), '[]'::jsonb)
      from (
        select device_type, count(distinct visitor_id)::int as visitors, count(*)::int as pageviews
        from public.pageviews
        where website_id = p_website_id and occurred_at >= p_from and occurred_at < p_to
        group by device_type
      ) q
    ),
    'browsers', (
      select coalesce(jsonb_agg(jsonb_build_object('browser', q.browser, 'visitors', q.visitors) order by q.visitors desc), '[]'::jsonb)
      from (
        select coalesce(browser, 'Unknown') as browser, count(distinct visitor_id)::int as visitors
        from public.pageviews
        where website_id = p_website_id and occurred_at >= p_from and occurred_at < p_to
        group by 1
        order by 2 desc
        limit 12
      ) q
    ),
    'os', (
      select coalesce(jsonb_agg(jsonb_build_object('os', q.os, 'visitors', q.visitors) order by q.visitors desc), '[]'::jsonb)
      from (
        select coalesce(os, 'Unknown') as os, count(distinct visitor_id)::int as visitors
        from public.pageviews
        where website_id = p_website_id and occurred_at >= p_from and occurred_at < p_to
        group by 1
        order by 2 desc
        limit 12
      ) q
    )
  );
end;
$$;

create or replace function public.analytics_geo(
  p_website_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (country_code text, visitors int, pageviews int)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.has_website_access(p_website_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select coalesce(pv.country, 'Unknown') as country_code,
    count(distinct pv.visitor_id)::int,
    count(*)::int
  from public.pageviews pv
  where pv.website_id = p_website_id
    and pv.occurred_at >= p_from
    and pv.occurred_at < p_to
  group by 1
  order by 2 desc;
end;
$$;

create or replace function public.analytics_events(
  p_website_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (event_name text, event_count int, visitors int)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.has_website_access(p_website_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select e.name as event_name, count(*)::int as event_count, count(distinct e.visitor_id)::int as visitors
  from public.events e
  where e.website_id = p_website_id
    and e.occurred_at >= p_from
    and e.occurred_at < p_to
  group by e.name
  order by count(*) desc;
end;
$$;

create or replace function public.heatmap_paths(
  p_website_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns table (page_path text)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if not public.has_website_access(p_website_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  select distinct pv.path as page_path
  from public.pageviews pv
  where pv.website_id = p_website_id
    and pv.occurred_at >= p_from
    and pv.occurred_at < p_to
  order by 1;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.websites enable row level security;
alter table public.website_members enable row level security;
alter table public.visitors enable row level security;
alter table public.sessions enable row level security;
alter table public.pageviews enable row level security;
alter table public.events enable row level security;
alter table public.heatmap_clicks enable row level security;
alter table public.heatmap_moves enable row level security;
alter table public.heatmap_scrolls enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_owner());

create policy websites_select on public.websites
  for select to authenticated
  using (public.has_website_access(id));

create policy websites_insert on public.websites
  for insert to authenticated
  with check (public.is_owner() and created_by = auth.uid());

create policy websites_update on public.websites
  for update to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy websites_delete on public.websites
  for delete to authenticated
  using (public.is_owner());

create policy members_select on public.website_members
  for select to authenticated
  using (public.is_owner() or user_id = auth.uid());

create policy members_insert on public.website_members
  for insert to authenticated
  with check (public.is_owner());

create policy members_delete on public.website_members
  for delete to authenticated
  using (public.is_owner());

create policy visitors_select on public.visitors
  for select to authenticated
  using (public.has_website_access(website_id));

create policy sessions_select on public.sessions
  for select to authenticated
  using (public.has_website_access(website_id));

create policy pageviews_select on public.pageviews
  for select to authenticated
  using (public.has_website_access(website_id));

create policy events_select on public.events
  for select to authenticated
  using (public.has_website_access(website_id));

create policy clicks_select on public.heatmap_clicks
  for select to authenticated
  using (public.has_website_access(website_id));

create policy moves_select on public.heatmap_moves
  for select to authenticated
  using (public.has_website_access(website_id));

create policy scrolls_select on public.heatmap_scrolls
  for select to authenticated
  using (public.has_website_access(website_id));

grant usage on schema public to anon, authenticated;

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.websites to authenticated;
grant select, insert, delete on public.website_members to authenticated;

grant select on public.visitors, public.sessions, public.pageviews, public.events,
  public.heatmap_clicks, public.heatmap_moves, public.heatmap_scrolls to authenticated;

grant execute on function public.classify_source(text, text, text) to anon, authenticated;
grant execute on function public.analytics_overview(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.analytics_timeseries(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.analytics_pages(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.analytics_sources(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.analytics_devices(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.analytics_geo(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.analytics_events(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.heatmap_paths(uuid, timestamptz, timestamptz) to authenticated;
