-- Create table for tracking mobile app builds
create table if not exists public.mobile_builds (
  id uuid default uuid_generate_v4() primary key,
  version text not null,                    -- e.g., '1.0.0'
  build_number integer not null,            -- e.g., 42
  platform text not null default 'android', -- 'android' or 'ios'
  file_path text not null,                  -- Path to the file in the builds storage bucket
  file_size bigint,                         -- Size in bytes
  release_notes text,                       -- Release notes or changelog
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on mobile_builds
alter table public.mobile_builds enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Anyone can view mobile builds" on public.mobile_builds;
drop policy if exists "Authenticated users can manage mobile builds" on public.mobile_builds;

-- Allow public read access to mobile build records
create policy "Anyone can view mobile builds" on public.mobile_builds
  for select using (true);

-- Allow authenticated users to perform all actions on mobile builds (pipeline uploads)
create policy "Authenticated users can manage mobile builds" on public.mobile_builds
  for all using (auth.role() = 'authenticated');

-- Create storage bucket for mobile builds if it doesn't exist
insert into storage.buckets (id, name, public)
values ('builds', 'builds', true)
on conflict (id) do nothing;

-- Drop existing storage policies if they exist
drop policy if exists "Public Access to Builds" on storage.objects;
drop policy if exists "Authenticated users can upload builds" on storage.objects;
drop policy if exists "Authenticated users can delete builds" on storage.objects;

-- Allow public read access to the builds bucket
create policy "Public Access to Builds" on storage.objects
  for select using (bucket_id = 'builds');

-- Allow authenticated users (pipeline) to upload builds
create policy "Authenticated users can upload builds" on storage.objects
  for insert with check (
    bucket_id = 'builds' 
    and auth.role() = 'authenticated'
  );

-- Allow authenticated users (pipeline) to delete old builds
create policy "Authenticated users can delete builds" on storage.objects
  for delete using (
    bucket_id = 'builds'
    and auth.role() = 'authenticated'
  );
