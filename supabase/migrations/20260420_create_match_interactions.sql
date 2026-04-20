-- ============================================
-- ZON-116: Real-time Match Interaction System
-- Comments, Reactions, Polls for live matches
-- ============================================

-- === Match Comments ===

CREATE TABLE IF NOT EXISTS match_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
    minute INT,
    likes_count INT NOT NULL DEFAULT 0,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_comments_match_created
    ON match_comments (match_id, created_at DESC)
    WHERE NOT is_deleted;

CREATE INDEX idx_match_comments_user
    ON match_comments (user_id, created_at DESC);

-- === Comment Likes ===

CREATE TABLE IF NOT EXISTS comment_likes (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES match_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, comment_id)
);

-- === Match Reactions (emoji bursts) ===

CREATE TYPE reaction_type AS ENUM (
    'goal', 'fire', 'clap', 'cry', 'angry', 'laugh', 'heart', 'shocked'
);

CREATE TABLE IF NOT EXISTS match_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction reaction_type NOT NULL,
    minute INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_reactions_match_minute
    ON match_reactions (match_id, minute DESC);

-- Aggregate view: reaction counts per match per minute window
CREATE OR REPLACE VIEW match_reaction_counts AS
SELECT
    match_id,
    minute,
    reaction,
    COUNT(*) AS count
FROM match_reactions
GROUP BY match_id, minute, reaction;

-- === Match Polls ===

CREATE TABLE IF NOT EXISTS match_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL CHECK (char_length(question) BETWEEN 5 AND 200),
    poll_type TEXT NOT NULL DEFAULT 'single_choice' CHECK (poll_type IN ('single_choice', 'multiple_choice')),
    closes_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    total_votes INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_polls_match_active
    ON match_polls (match_id, is_active, created_at DESC);

CREATE TABLE IF NOT EXISTS poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES match_polls(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL CHECK (char_length(option_text) BETWEEN 1 AND 100),
    vote_count INT NOT NULL DEFAULT 0,
    position INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_poll_options_poll
    ON poll_options (poll_id, position);

CREATE TABLE IF NOT EXISTS user_poll_votes (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    poll_id UUID NOT NULL REFERENCES match_polls(id) ON DELETE CASCADE,
    option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, poll_id)
);

-- === Match Presence (viewer tracking) ===

CREATE TABLE IF NOT EXISTS match_presence (
    match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_id, user_id)
);

CREATE INDEX idx_match_presence_active
    ON match_presence (match_id, last_seen_at DESC);

-- === RLS Policies ===

ALTER TABLE match_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_presence ENABLE ROW LEVEL SECURITY;

-- Comments: anyone can read non-deleted, authenticated can insert own
CREATE POLICY "comments_select" ON match_comments
    FOR SELECT USING (NOT is_deleted);

CREATE POLICY "comments_insert" ON match_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_delete_own" ON match_comments
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id AND is_deleted = TRUE);

-- Comment Likes: authenticated users
CREATE POLICY "likes_select" ON comment_likes
    FOR SELECT USING (TRUE);

CREATE POLICY "likes_insert" ON comment_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "likes_delete" ON comment_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Reactions: authenticated users
CREATE POLICY "reactions_select" ON match_reactions
    FOR SELECT USING (TRUE);

CREATE POLICY "reactions_insert" ON match_reactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Polls: anyone can read, authenticated can create
CREATE POLICY "polls_select" ON match_polls
    FOR SELECT USING (TRUE);

CREATE POLICY "polls_insert" ON match_polls
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Poll Options: anyone can read
CREATE POLICY "poll_options_select" ON poll_options
    FOR SELECT USING (TRUE);

-- Poll Votes: authenticated users
CREATE POLICY "votes_select" ON user_poll_votes
    FOR SELECT USING (TRUE);

CREATE POLICY "votes_insert" ON user_poll_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Presence: authenticated users
CREATE POLICY "presence_select" ON match_presence
    FOR SELECT USING (TRUE);

CREATE POLICY "presence_upsert" ON match_presence
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "presence_update" ON match_presence
    FOR UPDATE USING (auth.uid() = user_id);

-- === Functions ===

-- Increment comment likes atomically
CREATE OR REPLACE FUNCTION increment_comment_likes()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE match_comments
    SET likes_count = likes_count + 1
    WHERE id = NEW.comment_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_increment_comment_likes
    AFTER INSERT ON comment_likes
    FOR EACH ROW EXECUTE FUNCTION increment_comment_likes();

-- Decrement comment likes atomically
CREATE OR REPLACE FUNCTION decrement_comment_likes()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE match_comments
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.comment_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_decrement_comment_likes
    AFTER DELETE ON comment_likes
    FOR EACH ROW EXECUTE FUNCTION decrement_comment_likes();

-- Increment poll vote count atomically
CREATE OR REPLACE FUNCTION increment_poll_vote()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = NEW.option_id;
    UPDATE match_polls SET total_votes = total_votes + 1 WHERE id = NEW.poll_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_increment_poll_vote
    AFTER INSERT ON user_poll_votes
    FOR EACH ROW EXECUTE FUNCTION increment_poll_vote();

-- Active viewer count for a match
CREATE OR REPLACE FUNCTION get_match_viewer_count(p_match_id BIGINT)
RETURNS INT AS $$
    SELECT COUNT(*)::INT
    FROM match_presence
    WHERE match_id = p_match_id
      AND last_seen_at > NOW() - INTERVAL '3 minutes';
$$ LANGUAGE sql STABLE;
