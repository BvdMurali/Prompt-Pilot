-- Enable realtime updates for public.users table safely catching duplicate errors
do $$
begin
  begin
    alter publication supabase_realtime add table public.users;
  exception
    when duplicate_object then
      -- If users table is already added to the publication, do nothing
      raise notice 'Table public.users is already in supabase_realtime publication.';
    when others then
      raise notice 'Failed to alter publication: %', sqlerrm;
  end;
end;
$$;
