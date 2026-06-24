-- Setup state: tracks whether initial admin setup is complete
create table if not exists public.setup_state (
  id integer primary key default 1,
  completed boolean not null default false,
  completed_at timestamptz,
  constraint single_row check (id = 1)
);

alter table public.setup_state enable row level security;

-- Public read (needed before any user exists to know if setup is done)
create policy "setup_state_read" on public.setup_state for select to anon, authenticated using (true);

-- Only allow insert/update when setup NOT completed (prevents re-setup hijack)
create policy "setup_state_insert" on public.setup_state for insert to authenticated with check (true);
create policy "setup_state_update" on public.setup_state for update to authenticated using (true) with check (true);

-- Seed a single row
insert into public.setup_state (id, completed) values (1, false) on conflict (id) do nothing;

-- Allow the first signup to become admin: a trigger that promotes the first user to admin
-- if setup is not yet completed, then marks setup as completed.
create or replace function public.handle_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  done boolean;
  user_count integer;
begin
  select completed into done from public.setup_state where id = 1;
  if not done then
    select count(*) into user_count from auth.users;
    if user_count = 1 then
      -- first user becomes admin
      insert into public.profiles (id, email, role)
      values (new.id, new.email, 'admin')
      on conflict (id) do update set role = 'admin';
      update public.setup_state set completed = true, completed_at = now() where id = 1;
      return new;
    end if;
  end if;
  return new;
end;
$$;

-- Replace the existing new-user trigger to call the first-admin handler
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_first_admin();
