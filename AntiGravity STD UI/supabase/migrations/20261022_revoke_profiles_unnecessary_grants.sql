-- =========================================================================
-- Hardening: Revoke Unnecessary Authenticated Table Grants on Profiles
-- =========================================================================
REVOKE TRUNCATE, TRIGGER, REFERENCES
ON TABLE public.profiles
FROM authenticated;
