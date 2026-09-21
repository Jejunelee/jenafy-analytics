-- Invite codes are enough to join. Anyone with a valid code can create a password.
-- Confirm the new auth user so they are not blocked by email-confirmation settings.

create or replace function public.peek_invite_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  compact text;
begin
  compact := private.normalize_invite_code(p_code);
  select w.name, w.domain, c.expires_at
    into rec
  from public.invite_codes c
  join public.websites w on w.id = c.website_id
  where c.code = compact
    and c.redeemed_at is null
    and c.expires_at > now();

  if not found then
    return jsonb_build_object('ok', false);
  end if;

  return jsonb_build_object(
    'ok', true,
    'site_name', rec.name,
    'site_domain', rec.domain,
    'expires_at', rec.expires_at
  );
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

create or replace function public.confirm_invited_user(p_code text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  compact text;
  uid uuid;
begin
  compact := private.normalize_invite_code(p_code);
  if not exists (
    select 1
    from public.invite_codes
    where code = compact
      and redeemed_at is null
      and expires_at > now()
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select id into uid
  from auth.users
  where lower(email) = lower(trim(p_email));

  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'missing');
  end if;

  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now())
  where id = uid;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.peek_invite_code(text) from public;
revoke all on function public.confirm_invited_user(text, text) from public;
grant execute on function public.peek_invite_code(text) to anon, authenticated;
grant execute on function public.confirm_invited_user(text, text) to anon, authenticated;
