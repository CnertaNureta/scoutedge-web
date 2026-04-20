-- Add stripe_checkout_session_id for webhook idempotency (ZON-125 security fix)
alter table api_keys
  add column if not exists stripe_checkout_session_id text;

create unique index if not exists idx_api_keys_checkout_session
  on api_keys (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
