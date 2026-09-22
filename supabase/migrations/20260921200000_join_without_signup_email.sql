-- Create invited clients as confirmed auth users so join never sends a signup email.

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
  new_email text;
  is_owner boolean := false;
  inst uuid;
begin
  if length(coalesce(p_password, '')) < 8 then
    return jsonb_build_object('ok', false, 'error', 'weak');
  end if;

  new_email := lower(trim(p_email));
  if new_email = '' or position('@' in new_email) = 0 then
    return jsonb_build_object('ok', false, 'error', 'missing');
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
  where lower(email) = new_email
    and deleted_at is null;

  select exists (
    select 1 from public.profiles
    where id = uid and global_role = 'owner'
  ) into is_owner;

  if is_owner then
    return jsonb_build_object('ok', false, 'error', 'owner');
  end if;

  select coalesce(
    (select instance_id from auth.users where instance_id is not null limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) into inst;

  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new,
      email_change_token_current,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      is_sso_user,
      is_anonymous
    ) values (
      inst,
      uid,
      'authenticated',
      'authenticated',
      new_email,
      crypt(p_password, gen_salt('bf', 10)),
      now(),
      '',
      '',
      '',
      '',
      '',
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      '{}'::jsonb,
      now(),
      now(),
      false,
      false
    );

    insert into auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      uid::text,
      uid,
      jsonb_build_object(
        'sub', uid::text,
        'email', new_email,
        'email_verified', true
      ),
      'email',
      now(),
      now(),
      now()
    );
  else
    update auth.users
    set
      encrypted_password = crypt(p_password, gen_salt('bf', 10)),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      confirmation_token = '',
      confirmation_sent_at = null,
      recovery_token = '',
      email_change = '',
      email_change_token_new = '',
      updated_at = now()
    where id = uid;

    insert into auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    select
      uid::text,
      uid,
      jsonb_build_object(
        'sub', uid::text,
        'email', new_email,
        'email_verified', true
      ),
      'email',
      now(),
      now(),
      now()
    where not exists (
      select 1 from auth.identities
      where user_id = uid and provider = 'email'
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.prepare_invited_user(text, text, text) from public;
grant execute on function public.prepare_invited_user(text, text, text) to anon, authenticated;
