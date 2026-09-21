-- Claim email invites on signup, and add 72-hour invite codes.

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites (id) on delete cascade,
  code text not null unique,
  email text,
  expires_at timestamptz not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_by uuid references public.profiles (id) on delete set null
);

create index if not exists invite_codes_website_idx on public.invite_codes (website_id);
create index if not exists invite_codes_expires_idx on public.invite_codes (expires_at);

alter table public.invite_codes enable row level security;

drop policy if exists invite_codes_select on public.invite_codes;
create policy invite_codes_select on public.invite_codes
  for select to authenticated
  using (public.is_owner());

drop policy if exists invite_codes_insert on public.invite_codes;
create policy invite_codes_insert on public.invite_codes
  for insert to authenticated
  with check (public.is_owner());

drop policy if exists invite_codes_update on public.invite_codes;
create policy invite_codes_update on public.invite_codes
  for update to authenticated
  using (public.is_owner())
  with check (public.is_owner());

drop policy if exists invite_codes_delete on public.invite_codes;
create policy invite_codes_delete on public.invite_codes
  for delete to authenticated
  using (public.is_owner());

grant select, insert, update, delete on public.invite_codes to authenticated;

create or replace function private.normalize_invite_code(p_code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^0-9A-Za-z]', '', 'g'));
$$;

create or replace function private.claim_pending_invites(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  user_email text;
begin
  select email into user_email from public.profiles where id = p_user_id;
  if user_email is null or user_email = '' then
    return;
  end if;

  insert into public.website_members (website_id, user_id, role)
  select pi.website_id, p_user_id, 'client'
  from public.pending_invites pi
  where lower(pi.email) = lower(user_email)
  on conflict do nothing;

  delete from public.pending_invites
  where lower(email) = lower(user_email);
end;
$$;

create or replace function private.redeem_invite_code(p_code text, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.invite_codes%rowtype;
  compact text;
  user_email text;
begin
  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;

  compact := private.normalize_invite_code(p_code);
  select * into rec
  from public.invite_codes
  where code = compact
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if rec.redeemed_at is not null then
    return jsonb_build_object('ok', false, 'error', 'used');
  end if;
  if rec.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;

  select email into user_email from public.profiles where id = p_user_id;
  if rec.email is not null and lower(rec.email) is distinct from lower(coalesce(user_email, '')) then
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;

  insert into public.website_members (website_id, user_id, role)
  values (rec.website_id, p_user_id, 'client')
  on conflict do nothing;

  update public.invite_codes
  set redeemed_at = now(), redeemed_by = p_user_id
  where id = rec.id;

  if rec.email is not null then
    delete from public.pending_invites
    where website_id = rec.website_id
      and lower(email) = lower(rec.email);
  end if;

  return jsonb_build_object('ok', true, 'website_id', rec.website_id);
end;
$$;

create or replace function public.claim_my_invites()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  perform private.claim_pending_invites(auth.uid());
end;
$$;

create or replace function public.redeem_invite_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;
  return private.redeem_invite_code(p_code, auth.uid());
end;
$$;

revoke all on function public.claim_my_invites() from public;
revoke all on function public.redeem_invite_code(text) from public;
grant execute on function public.claim_my_invites() to authenticated;
grant execute on function public.redeem_invite_code(text) to authenticated;

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

  perform private.claim_pending_invites(new.id);
  return new;
end;
$$;
