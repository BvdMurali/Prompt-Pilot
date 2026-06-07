-- 1. Add deleted_at column to public.users table if it doesn't exist
alter table public.users add column if not exists deleted_at timestamp with time zone default null;

-- 2. Update RLS policies for prompts
drop policy if exists "Users can perform all actions on their own prompts" on public.prompts;
create policy "Users can perform all actions on their own prompts" on public.prompts
  for all using (
    auth.uid() = user_id 
    and exists (
      select 1 from public.users 
      where users.id = auth.uid() 
      and users.deleted_at is null
    )
  );

-- 3. Update RLS policies for templates
drop policy if exists "Users can manage their custom templates" on public.templates;
create policy "Users can manage their custom templates" on public.templates
  for all using (
    auth.uid() = user_id
    and exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.deleted_at is null
    )
  );

-- 4. Update RLS policies for favorites
drop policy if exists "Users can manage their own favorites" on public.favorites;
create policy "Users can manage their own favorites" on public.favorites
  for all using (
    auth.uid() = user_id
    and exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.deleted_at is null
    )
  );

-- 5. Update RLS policies for history
drop policy if exists "Users can manage their own history" on public.history;
create policy "Users can manage their own history" on public.history
  for all using (
    auth.uid() = user_id
    and exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.deleted_at is null
    )
  );

-- 6. Update RLS policies for settings
drop policy if exists "Users can manage their own settings" on public.settings;
create policy "Users can manage their own settings" on public.settings
  for all using (
    auth.uid() = user_id
    and exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.deleted_at is null
    )
  );

-- 7. Update RLS policies for analytics_events
drop policy if exists "Users can view their own analytics" on public.analytics_events;
create policy "Users can view their own analytics" on public.analytics_events
  for select using (
    auth.uid() = user_id
    and exists (
      select 1 from public.users
      where users.id = auth.uid()
      and users.deleted_at is null
    )
  );

-- 8. Create a function to permanently delete soft-deleted accounts after 30 days
create or replace function public.purge_soft_deleted_users()
returns void as $$
begin
  -- Deletes auth user rows which cascades down to all public user rows and associated content
  delete from auth.users
  where id in (
    select id 
    from public.users 
    where deleted_at is not null 
    and deleted_at < now() - interval '30 days'
  );
end;
$$ language plpgsql security definer;
