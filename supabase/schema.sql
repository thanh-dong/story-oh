-- Stories table
create table public.stories (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  summary text not null,
  cover_image text,
  price numeric default 0,
  age_range text not null default '4-8',
  story_tree jsonb not null,
  created_at timestamptz default now()
);

-- User stories (ownership + progress)
create table public.user_stories (
  user_id uuid references auth.users(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  progress jsonb default '{"current_node": "start", "history": ["start"]}',
  created_at timestamptz default now(),
  primary key (user_id, story_id)
);

-- RLS
alter table public.stories enable row level security;
alter table public.user_stories enable row level security;

-- Anyone can read stories
create policy "Stories are viewable by everyone"
  on public.stories for select using (true);

-- Users can read/write their own user_stories
create policy "Users can view own stories"
  on public.user_stories for select using (auth.uid() = user_id);

create policy "Users can insert own stories"
  on public.user_stories for insert with check (auth.uid() = user_id);

create policy "Users can update own stories"
  on public.user_stories for update using (auth.uid() = user_id);
