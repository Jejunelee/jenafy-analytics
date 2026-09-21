alter function private.generate_public_id() security definer set search_path = public, private;

alter function private.websites_before_insert() security definer set search_path = public, private;

revoke all on function private.generate_public_id() from public;
revoke all on function private.websites_before_insert() from public;
revoke all on function private.websites_after_insert() from public;
