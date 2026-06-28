-- Cook & Learn AI — user-data schema. Run once in the Supabase SQL editor.
-- user_id is the Clerk user id (text). All access is gated server-side by apiGuard()
-- (Clerk auth) and scoped by user_id; RLS is intentionally not used in v1.

-- Phase 1 — Cookbook (saved recipes)
create table if not exists saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  video_id text not null,
  mode text not null default 'cook',
  title text,
  thumbnail text,
  recipe jsonb not null,            -- {summary, ingredients[], steps[{step,timestamp}]}
  checked_ingredients int[] default '{}',  -- indices of ingredients the user has checked off
  folder_id uuid,                   -- used in Phase 2
  created_at timestamptz default now(),
  unique (user_id, video_id)
);
create index if not exists saved_recipes_user_created_idx
  on saved_recipes (user_id, created_at desc);

-- Phase 2 — Folders & cooking history
create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists cook_history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  video_id text not null,
  title text,
  thumbnail text,
  last_step_index int default 0,
  total_steps int,
  status text not null default 'in_progress',  -- 'in_progress' | 'completed'
  updated_at timestamptz default now(),
  completed_at timestamptz,
  unique (user_id, video_id)
);

-- Phase 3 — Pantry / dietary preferences
create table if not exists preferences (
  user_id text primary key,
  dietary text[] default '{}',
  pantry text[] default '{}',
  allergies text[] default '{}',
  updated_at timestamptz default now()
);
