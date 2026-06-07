-- Create check_email_exists function to verify email presence bypassing RLS for sign-in validation
create or replace function public.check_email_exists(email_to_check text)
returns boolean as $$
begin
  return exists (
    select 1 
    from public.users 
    where email = email_to_check
  );
end;
$$ language plpgsql security definer;
