-- Supabase Security Advisor flags regular views as SECURITY DEFINER unless
-- they explicitly run with the querying user's privileges.

alter view if exists public.latest_team_features
  set (security_invoker = true);

alter view if exists public.match_team_features
  set (security_invoker = true);

alter view if exists public.latest_team_stats
  set (security_invoker = true);

alter view if exists public.latest_team_ratings
  set (security_invoker = true);
