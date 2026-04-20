-- Expand ai_content content_type check constraint to support blog article types
-- team_analysis: per-team deep-dive articles (48 teams)
-- group_preview: per-group preview articles (12 groups)
-- player_spotlight: individual player feature articles

alter table ai_content drop constraint if exists ai_content_content_type_check;
alter table ai_content add constraint ai_content_content_type_check
  check (content_type in (
    'match_preview',
    'daily_briefing',
    'team_narrative',
    'player_narrative',
    'team_analysis',
    'group_preview',
    'player_spotlight'
  ));
