-- When a client joins with a valid invite, set their password even if the
-- email already exists from an earlier magic-link / incomplete signup.

create or replace function public.prepare_invited_user(
  p_code text,
  p_email text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  compact text;
  uid uuid;
  is_owner boolean := false;
begin
  if length(coalesce(p_password, '')) < 8 then
    return jsonb_build_object('ok', false, 'error', 'weak');
  end if;

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

  select exists (
    select 1 from public.profiles
    where id = uid and global_role = 'owner'
  ) into is_owner;

  if is_owner then
    return jsonb_build_object('ok', false, 'error', 'owner');
  end if;

  update auth.users
  set
    encrypted_password = crypt(p_password, gen_salt('bf', 10)),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    confirmation_token = '',
    recovery_token = '',
    email_change = '',
    email_change_token_new = '',
    updated_at = now()
  where id = uid;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.prepare_invited_user(text, text, text) from public;
grant execute on function public.prepare_invited_user(text, text, text) to anon, authenticated;
