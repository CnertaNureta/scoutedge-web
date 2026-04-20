-- Newsletter subscribers table for email subscriptions
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('homepage', 'article', 'popup')),
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  unsubscribed_at TIMESTAMPTZ DEFAULT NULL,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ DEFAULT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT newsletter_subscribers_email_unique UNIQUE (email)
);

-- Index for quick email lookups
CREATE INDEX idx_newsletter_subscribers_email ON newsletter_subscribers (email);

-- Index for confirmed active subscribers (for sending campaigns)
CREATE INDEX idx_newsletter_subscribers_active ON newsletter_subscribers (confirmed)
  WHERE confirmed = TRUE AND unsubscribed_at IS NULL;

-- Auto-update updated_at timestamp
CREATE TRIGGER set_newsletter_subscribers_updated_at
  BEFORE UPDATE ON newsletter_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS: no user-facing RLS needed — all access goes through admin client
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
