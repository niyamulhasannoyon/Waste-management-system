-- Clean Savar (ক্লিন সাভার) — Google OAuth Email Column & Supabase RLS Policies
-- Ensures seamless profile sync for Google authentication and secure RLS compatibility.

-- 1. Add email column and index to public.users if not already existing
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- 2. Row Level Security (RLS) Configuration for public.users & public.auth_sessions
-- In case RLS is enabled in the Supabase Dashboard, these policies ensure seamless user sign-in and session sync.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Allow public read access to users'
    ) THEN
        CREATE POLICY "Allow public read access to users"
            ON public.users FOR SELECT
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Allow user registration and upsert'
    ) THEN
        CREATE POLICY "Allow user registration and upsert"
            ON public.users FOR INSERT
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Allow user update'
    ) THEN
        CREATE POLICY "Allow user update"
            ON public.users FOR UPDATE
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'auth_sessions' AND policyname = 'Allow session access and creation'
    ) THEN
        CREATE POLICY "Allow session access and creation"
            ON public.auth_sessions FOR ALL
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
