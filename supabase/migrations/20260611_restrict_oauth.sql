-- Migration: Restrict OAuth Signups to Pre-Registered Users
-- Path: supabase/migrations/20260611_restrict_oauth.sql

create or replace function public.restrict_oauth_signup()
returns trigger as $$
begin
  -- Inspect provider metadata to identify OAuth-based signups
  if (new.raw_app_meta_data->>'provider' is not null and new.raw_app_meta_data->>'provider' <> 'email') then
    -- Verify if the email already exists in public.users
    -- (This allows OAuth logins for existing users, but blocks new signups)
    if not exists (
      select 1 from public.users where email = new.email
    ) then
      raise exception 'Registration is restricted. Please sign up with an email and password first, or contact an administrator.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Apply BEFORE INSERT trigger to auth.users
drop trigger if exists before_auth_user_created on auth.users;
create trigger before_auth_user_created
  before insert on auth.users
  for each row execute procedure public.restrict_oauth_signup();
