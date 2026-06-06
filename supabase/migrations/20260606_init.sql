-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. USERS PROFILE
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on users
alter table public.users enable row level security;

create policy "Users can view their own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.users
  for update using (auth.uid() = id);

-- Trigger to create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    name = excluded.name,
    avatar_url = excluded.avatar_url,
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists first
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. PROMPTS (Saved prompts in Library)
create table if not exists public.prompts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  content text not null,
  is_favorite boolean default false not null,
  category text default 'General',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.prompts enable row level security;

create policy "Users can perform all actions on their own prompts" on public.prompts
  for all using (auth.uid() = user_id);


-- 3. PROMPT VERSIONS
create table if not exists public.prompt_versions (
  id uuid default uuid_generate_v4() primary key,
  prompt_id uuid references public.prompts(id) on delete cascade not null,
  version_number integer not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.prompt_versions enable row level security;

create policy "Users can view versions of their own prompts" on public.prompt_versions
  for select using (
    exists (
      select 1 from public.prompts
      where prompts.id = prompt_versions.prompt_id
      and prompts.user_id = auth.uid()
    )
  );

create policy "Users can insert versions for their own prompts" on public.prompt_versions
  for insert with check (
    exists (
      select 1 from public.prompts
      where prompts.id = prompt_versions.prompt_id
      and prompts.user_id = auth.uid()
    )
  );


-- 4. TEMPLATES (System templates & Custom templates)
create table if not exists public.templates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade, -- null means global template
  title text not null,
  description text,
  content text not null,
  tags text[] default '{}'::text[],
  is_system boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.templates enable row level security;

create policy "Anyone can view system templates, users can view their own" on public.templates
  for select using (user_id is null or auth.uid() = user_id);

create policy "Users can manage their custom templates" on public.templates
  for all using (auth.uid() = user_id);


-- 5. FAVORITES (Join table for templates and prompts)
create table if not exists public.favorites (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  prompt_id uuid references public.prompts(id) on delete cascade,
  template_id uuid references public.templates(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint one_favorite_target check (
    (prompt_id is not null and template_id is null) or 
    (prompt_id is null and template_id is not null)
  )
);

alter table public.favorites enable row level security;

create policy "Users can manage their own favorites" on public.favorites
  for all using (auth.uid() = user_id);


-- 6. HISTORY
create table if not exists public.history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  original_input text not null,
  optimized_output text not null,
  action_used text not null, -- e.g., 'optimize_prompt', 'rewrite_grammar', 'tone_executive'
  metadata jsonb default '{}'::jsonb not null, -- score, explanations, variations
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.history enable row level security;

create policy "Users can manage their own history" on public.history
  for all using (auth.uid() = user_id);


-- 7. SETTINGS
create table if not exists public.settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade unique not null,
  preferred_model text default 'gemini-2.5-flash' not null,
  default_tone text default 'professional' not null,
  theme text default 'dark' not null,
  api_key_override jsonb default '{}'::jsonb, -- stores encrypted API keys if custom
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.settings enable row level security;

create policy "Users can manage their own settings" on public.settings
  for all using (auth.uid() = user_id);


-- 8. ANALYTICS EVENTS
create table if not exists public.analytics_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade,
  event_name text not null,
  properties jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.analytics_events enable row level security;

create policy "Users can view their own analytics" on public.analytics_events
  for select using (auth.uid() = user_id);

create policy "Users can insert their own analytics events" on public.analytics_events
  for insert with check (auth.uid() = user_id or auth.uid() is null);

-- Auto insert settings on profile creation
create or replace function public.handle_new_user_settings()
returns trigger as $$
begin
  insert into public.settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created_settings on public.users;
create trigger on_profile_created_settings
  after insert on public.users
  for each row execute procedure public.handle_new_user_settings();
