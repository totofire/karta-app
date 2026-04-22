-- Supabase: grant SELECT to anon and authenticated roles on all public tables.
-- Required for Supabase Realtime (postgres_changes) to work with the anon key.
-- Prisma migrate reset drops and recreates tables without re-applying these grants,
-- so this migration ensures they are always present after any reset.

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
