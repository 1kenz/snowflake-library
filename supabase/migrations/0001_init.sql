-- SnowFlakeShelf — Supabase (Postgres) şeması
-- Kimlik: Supabase Auth (Google OAuth). profiles.id = auth.users.id

create extension if not exists "pgcrypto";

-- ============ Tablolar ============

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  avatar_color text not null default '#0e7490',
  role text not null default 'member' check (role in ('admin','member')),
  is_child boolean not null default false,
  is_active boolean not null default true,
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value text not null
);
insert into public.app_settings(key, value) values ('require_approval', 'false') on conflict (key) do nothing;

create table if not exists public.books (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_private boolean not null default false,
  title text not null,
  author text not null default '',
  publisher text not null default '',
  publish_year integer,
  isbn text not null default '',
  page_count integer,
  language text not null default 'tr',
  description text not null default '',
  genre text not null default '',
  audience text not null default '',
  series_name text not null default '',
  series_index integer,
  cover_path text not null default '',
  status text not null default 'to_read' check (status in ('to_read','reading','finished','abandoned')),
  rating numeric not null default 0,
  current_page integer not null default 0,
  started_at date,
  finished_at date,
  is_wishlist boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags (
  id bigint generated always as identity primary key,
  name text not null unique,
  color text not null default '#22d3ee'
);

create table if not exists public.book_tags (
  book_id bigint not null references public.books(id) on delete cascade,
  tag_id bigint not null references public.tags(id) on delete cascade,
  primary key (book_id, tag_id)
);

create table if not exists public.notes (
  id bigint generated always as identity primary key,
  book_id bigint not null references public.books(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'note' check (type in ('note','quote','summary')),
  title text not null default '',
  content text not null,
  page_no integer,
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  user_id uuid not null references public.profiles(id) on delete cascade,
  year integer not null,
  target_books integer not null default 12,
  primary key (user_id, year)
);

create table if not exists public.loans (
  id bigint generated always as identity primary key,
  book_id bigint not null references public.books(id) on delete cascade,
  lent_to_user_id uuid references public.profiles(id) on delete set null,
  lent_to_name text not null default '',
  lent_at timestamptz not null default now(),
  returned_at timestamptz
);

create index if not exists idx_books_user on public.books(user_id);
create index if not exists idx_notes_book on public.notes(book_id);
create index if not exists idx_loans_book on public.loans(book_id);
create index if not exists idx_profiles_approval on public.profiles(approval_status);

-- ============ Yeni kullanıcı tetikleyicisi ============
-- Google ile ilk girişte otomatik profil oluşturur.
-- admin@example.com her zaman admin + onaylı olur.
-- Diğerleri: app_settings.require_approval='true' ise 'pending', değilse 'approved'.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_require_approval boolean;
  v_is_admin boolean;
  v_role text;
  v_status text;
  v_name text;
begin
  v_is_admin := lower(new.email) = 'admin@example.com';
  select coalesce((select value from public.app_settings where key = 'require_approval'), 'false') = 'true'
    into v_require_approval;
  v_role := case when v_is_admin then 'admin' else 'member' end;
  v_status := case when v_is_admin then 'approved' when v_require_approval then 'pending' else 'approved' end;
  v_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));

  insert into public.profiles (id, email, name, role, approval_status)
  values (new.id, new.email, v_name, v_role, v_status)
  on conflict (id) do nothing;

  if v_status = 'approved' then
    insert into public.goals(user_id, year, target_books)
    values (new.id, extract(year from now())::int, 12)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ RLS ============
-- Not: Express API, RLS'i atlayan doğrudan bir Postgres bağlantısı (postgres rolü) kullanır;
-- erişim kontrolü esas olarak API katmanında yapılır. Aşağıdaki politikalar ek güvenlik katmanıdır
-- ve olası doğrudan istemci erişimi (PostgREST) için tanımlanmıştır.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.app_settings enable row level security;
alter table public.books enable row level security;
alter table public.tags enable row level security;
alter table public.book_tags enable row level security;
alter table public.notes enable row level security;
alter table public.goals enable row level security;
alter table public.loans enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using (auth.uid() = id or is_admin());
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists settings_select on public.app_settings;
create policy settings_select on public.app_settings for select to authenticated using (true);
drop policy if exists settings_admin_write on public.app_settings;
create policy settings_admin_write on public.app_settings for all to authenticated using (is_admin()) with check (is_admin());

drop policy if exists books_select on public.books;
create policy books_select on public.books for select to authenticated using (not is_private or user_id = auth.uid() or is_admin());
drop policy if exists books_insert on public.books;
create policy books_insert on public.books for insert to authenticated with check (user_id = auth.uid());
drop policy if exists books_modify on public.books;
create policy books_modify on public.books for update to authenticated using (user_id = auth.uid() or is_admin());
drop policy if exists books_delete on public.books;
create policy books_delete on public.books for delete to authenticated using (user_id = auth.uid() or is_admin());

drop policy if exists tags_all on public.tags;
create policy tags_all on public.tags for all to authenticated using (true) with check (true);
drop policy if exists book_tags_all on public.book_tags;
create policy book_tags_all on public.book_tags for all to authenticated using (true) with check (true);

drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes for select to authenticated using (not is_private or user_id = auth.uid() or is_admin());
drop policy if exists notes_insert on public.notes;
create policy notes_insert on public.notes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists notes_modify on public.notes;
create policy notes_modify on public.notes for update to authenticated using (user_id = auth.uid() or is_admin());
drop policy if exists notes_delete on public.notes;
create policy notes_delete on public.notes for delete to authenticated using (user_id = auth.uid() or is_admin());

drop policy if exists goals_all on public.goals;
create policy goals_all on public.goals for all to authenticated using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid() or is_admin());

drop policy if exists loans_select on public.loans;
create policy loans_select on public.loans for select to authenticated using (true);
drop policy if exists loans_write on public.loans;
create policy loans_write on public.loans for all to authenticated using (true) with check (true);

-- ============ Storage: kapak resimleri ============
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

drop policy if exists covers_public_read on storage.objects;
create policy covers_public_read on storage.objects for select using (bucket_id = 'covers');
drop policy if exists covers_auth_insert on storage.objects;
create policy covers_auth_insert on storage.objects for insert to authenticated with check (bucket_id = 'covers');
drop policy if exists covers_auth_update on storage.objects;
create policy covers_auth_update on storage.objects for update to authenticated using (bucket_id = 'covers');
drop policy if exists covers_auth_delete on storage.objects;
create policy covers_auth_delete on storage.objects for delete to authenticated using (bucket_id = 'covers');
