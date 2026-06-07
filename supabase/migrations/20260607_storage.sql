-- 1. Create storage bucket for avatars if it doesn't exist
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 2. Enable RLS on storage.objects (if not enabled)
alter table storage.objects enable row level security;

-- 3. Allow public read access to the avatars bucket
drop policy if exists "Public Access to Avatars" on storage.objects;
create policy "Public Access to Avatars" on storage.objects
  for select using (bucket_id = 'avatars');

-- 4. Allow authenticated users to upload an avatar to their own folder
drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars' 
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Allow authenticated users to update their own avatar
drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 6. Allow authenticated users to delete their own avatar
drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
