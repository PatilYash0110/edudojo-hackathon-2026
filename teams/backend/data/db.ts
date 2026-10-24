/**
 * Postgres access for DojoLearn tables. Reuses OpenMAIC's pool
 * (`DATABASE_URL`) and its migration runner.
 *
 * OWNER: BACKEND TEAM.
 *
 * Supabase: use the direct or session connection (port 5432). The transaction
 * pooler (6543) breaks the session locks OpenMAIC's migrations take.
 *
 * Every user-owned row cascades from `dojo_users`, and students cascade from
 * their class, so deleting a class erases all of its students' data.
 */
import { applySchemaMigrations, type SchemaMigrationSet } from '@openmaic/storage/pg-migrations';

import { getServerPersistenceProvider } from '@/lib/persistence/server-provider';

const BASELINE = `
CREATE TABLE dojo_users (
  id text PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('teacher', 'student')),
  display_name text NOT NULL,
  email text UNIQUE,
  password_hash text,
  class_id text,
  xp integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dojo_classes (
  id text PRIMARY KEY,
  teacher_id text NOT NULL REFERENCES dojo_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  pin text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dojo_users
  ADD CONSTRAINT dojo_users_class_fk FOREIGN KEY (class_id) REFERENCES dojo_classes(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX dojo_users_nickname ON dojo_users (class_id, lower(display_name)) WHERE role = 'student';
CREATE TABLE dojo_classrooms (
  id text PRIMARY KEY,
  creator_id text NOT NULL REFERENCES dojo_users(id) ON DELETE CASCADE,
  class_id text REFERENCES dojo_classes(id) ON DELETE CASCADE,
  owner_id text NOT NULL,
  run_id text NOT NULL,
  stage_id text,
  title text NOT NULL,
  prompt text NOT NULL,
  status text NOT NULL DEFAULT 'generating',
  error text,
  floors jsonb NOT NULL DEFAULT '[]',
  agents jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dojo_classrooms_class ON dojo_classrooms (class_id);
CREATE INDEX dojo_classrooms_creator ON dojo_classrooms (creator_id);
CREATE TABLE dojo_chat_messages (
  id bigserial PRIMARY KEY,
  classroom_id text NOT NULL REFERENCES dojo_classrooms(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES dojo_users(id) ON DELETE CASCADE,
  speaker text NOT NULL,
  speaker_name text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dojo_chat_messages_thread ON dojo_chat_messages (classroom_id, user_id, id);
CREATE TABLE dojo_quizzes (
  id text PRIMARY KEY,
  classroom_id text NOT NULL REFERENCES dojo_classrooms(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES dojo_users(id) ON DELETE CASCADE,
  questions jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dojo_answers (
  id bigserial PRIMARY KEY,
  quiz_id text NOT NULL REFERENCES dojo_quizzes(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES dojo_users(id) ON DELETE CASCADE,
  classroom_id text NOT NULL REFERENCES dojo_classrooms(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  prompt text NOT NULL,
  objective_id text NOT NULL,
  difficulty integer NOT NULL,
  correct boolean NOT NULL,
  score real NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, question_id)
);
CREATE INDEX dojo_answers_user ON dojo_answers (user_id, classroom_id, created_at);
CREATE TABLE dojo_mastery (
  user_id text NOT NULL REFERENCES dojo_users(id) ON DELETE CASCADE,
  classroom_id text NOT NULL REFERENCES dojo_classrooms(id) ON DELETE CASCADE,
  objective_id text NOT NULL,
  mastery real NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, classroom_id, objective_id)
);
CREATE TABLE dojo_usage (
  user_id text NOT NULL REFERENCES dojo_users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT current_date,
  kind text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, kind)
);
`;

/** Append new versions; never edit a shipped one (its checksum is recorded). */
export const DOJO_MIGRATIONS: SchemaMigrationSet = {
  store: 'dojo',
  migrations: [{ version: 1, name: 'baseline', up: BASELINE }],
};

let migrated: Promise<unknown> | undefined;

/** The shared pool, with DojoLearn tables migrated once per process. */
export async function db() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL is not set');
  const { pool } = await getServerPersistenceProvider(url);
  migrated ??= applySchemaMigrations(pool, DOJO_MIGRATIONS).catch((error) => {
    migrated = undefined;
    throw error;
  });
  await migrated;
  return pool;
}
