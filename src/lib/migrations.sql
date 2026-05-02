-- songs table
create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  film text,
  language text check (language in ('tamil', 'malayalam')),
  composer text,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  bpm integer default 80,
  alphatex text,
  tab_data jsonb,
  youtube_url text,
  play_count integer default 0,
  created_at timestamptz default now()
);

-- recordings table
create table if not exists recordings (
  id uuid primary key default gen_random_uuid(),
  song_id uuid references songs(id) on delete cascade,
  audio_url text,
  score integer,
  upvotes integer default 0,
  device_fingerprint text,
  flagged_count integer default 0,
  hidden boolean default false,
  created_at timestamptz default now()
);

-- upvotes table
create table if not exists upvotes (
  id uuid primary key default gen_random_uuid(),
  recording_id uuid references recordings(id) on delete cascade,
  device_fingerprint text,
  created_at timestamptz default now(),
  unique (recording_id, device_fingerprint)
);

-- Enable RLS
alter table songs enable row level security;
alter table recordings enable row level security;
alter table upvotes enable row level security;

-- Public read policies
create policy "Public read songs" on songs for select using (true);
create policy "Public read recordings" on recordings for select using (not hidden);
create policy "Public insert recordings" on recordings for insert with check (true);
create policy "Public update recordings" on recordings for update using (true);
create policy "Public read upvotes" on upvotes for select using (true);
create policy "Public insert upvotes" on upvotes for insert with check (true);
