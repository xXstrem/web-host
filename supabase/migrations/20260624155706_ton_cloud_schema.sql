-- TON Cloud Manager schema
create extension if not exists "pgcrypto";

-- Profiles (extends auth.users) with role
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('admin','user')),
  created_at timestamptz not null default now()
);

-- Folders (virtual directory tree)
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_id, name, owner_id)
);

-- Files metadata (blob stored in Supabase Storage)
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  name text not null,
  storage_path text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Activity logs
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  target text,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.folders enable row level security;
alter table public.files enable row level security;
alter table public.activity_logs enable row level security;

-- Profiles policies
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id or exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Folders policies
create policy "folders_select_own" on public.folders for select to authenticated using (auth.uid() = owner_id);
create policy "folders_insert_own" on public.folders for insert to authenticated with check (auth.uid() = owner_id);
create policy "folders_update_own" on public.folders for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "folders_delete_own" on public.folders for delete to authenticated using (auth.uid() = owner_id);

-- Files policies
create policy "files_select_own" on public.files for select to authenticated using (auth.uid() = owner_id);
create policy "files_insert_own" on public.files for insert to authenticated with check (auth.uid() = owner_id);
create policy "files_update_own" on public.files for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "files_delete_own" on public.files for delete to authenticated using (auth.uid() = owner_id);

-- Activity logs policies
create policy "logs_select_own" on public.activity_logs for select to authenticated using (auth.uid() = user_id or exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "logs_insert_own" on public.activity_logs for insert to authenticated with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- updated_at triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists folders_touch on public.folders;
create trigger folders_touch before update on public.folders
for each row execute function public.touch_updated_at();

drop trigger if exists files_touch on public.files;
create trigger files_touch before update on public.files
for each row execute function public.touch_updated_at();
