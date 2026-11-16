-- SnowFlakeShelf — Render Postgres şeması⁠​‍⁠‌​​​⁠‍​‍‌‌​⁠‍‍⁠‌⁠​​‌‌⁠​⁠‍‌​​​⁠‍⁠⁠⁠‍​‌‌⁠‍⁠​​‌‍‌‌​‍‍⁠‌‌⁠‍⁠‌‌⁠​‍‌‌⁠
-- Kimlik: kendi Google OAuth akışımız + kendi JWT'imiz (auth.ts / googleAuth.ts).
-- Not: Bu düz bir Postgres veritabanıdır (Supabase değil) — erişim kontrolü
-- tamamen Express API katmanında yapılır, RLS yoktur.

create table if not exists users (
  id bigserial primary key,
  google_sub text unique,
  email text not null unique,
  name text not null default '',
  avatar_color text not null default '#0e7490',
  role text not null default 'member' check (role in ('admin','member')),
  is_child boolean not null default false,
  is_active boolean not null default true,
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists app_settings (
  key text primary key,
  value text not null
);
insert into app_settings(key, value) values ('require_approval', 'false') on conflict (key) do nothing;

-- Kitap kapakları — ayrı bir depolama servisi kurmadan doğrudan veritabanında saklanır.
create table if not exists covers (
  id bigserial primary key,
  mime text not null,
  data bytea not null,
  created_at timestamptz not null default now()
);

create table if not exists books (
  id bigserial primary key,
  user_id bigint not null references users(id) on delete cascade,
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

create table if not exists tags (
  id bigserial primary key,
  name text not null unique,
  color text not null default '#22d3ee'
);

create table if not exists book_tags (
  book_id bigint not null references books(id) on delete cascade,
  tag_id bigint not null references tags(id) on delete cascade,
  primary key (book_id, tag_id)
);

create table if not exists notes (
  id bigserial primary key,
  book_id bigint not null references books(id) on delete cascade,
  user_id bigint not null references users(id) on delete cascade,
  type text not null default 'note' check (type in ('note','quote','summary')),
  title text not null default '',
  content text not null,
  page_no integer,
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists goals (
  user_id bigint not null references users(id) on delete cascade,
  year integer not null,
  target_books integer not null default 12,
  primary key (user_id, year)
);

create table if not exists loans (
  id bigserial primary key,
  book_id bigint not null references books(id) on delete cascade,
  lent_to_user_id bigint references users(id) on delete set null,
  lent_to_name text not null default '',
  lent_at timestamptz not null default now(),
  returned_at timestamptz
);

create index if not exists idx_books_user on books(user_id);
create index if not exists idx_notes_book on notes(book_id);
create index if not exists idx_loans_book on loans(book_id);
create index if not exists idx_users_approval on users(approval_status);
create index if not exists idx_users_email on users(lower(email));
-- ref: 40e253adc173903bf85ec194ad7b5c97⁠​‍⁠‌​​​⁠‍​‍‌‌​⁠‍‍⁠‌⁠​​‌‌⁠​⁠‍‌​​​⁠‍⁠⁠⁠‍​‌‌⁠‍⁠​​‌‍‌‌​‍‍⁠‌‌⁠‍⁠‌‌⁠​‍‌‌⁠
