CREATE TABLE IF NOT EXISTS guild_configs (
  guild_id TEXT PRIMARY KEY,
  verification_channel_id TEXT,
  panel_channel_id TEXT,
  log_channel_id TEXT,
  unverified_role_id TEXT,
  verified_role_id TEXT,
  suspicious_role_id TEXT,
  quarantine_role_id TEXT,
  moderator_role_id TEXT,
  language TEXT NOT NULL DEFAULT 'ar',
  difficulty TEXT NOT NULL DEFAULT 'adaptive',
  raid_mode TEXT NOT NULL DEFAULT 'auto',
  dm_mode TEXT NOT NULL DEFAULT 'prefer_dm',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification_attempts (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  challenge_type TEXT NOT NULL,
  risk_score INTEGER NOT NULL,
  risk_tier TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  delivery_mode TEXT NOT NULL,
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS verification_attempts_guild_created_idx
  ON verification_attempts (guild_id, created_at DESC);

CREATE INDEX IF NOT EXISTS verification_attempts_user_created_idx
  ON verification_attempts (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS security_events (
  id BIGSERIAL PRIMARY KEY,
  guild_id TEXT NOT NULL,
  user_id TEXT,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  summary TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS security_events_guild_created_idx
  ON security_events (guild_id, created_at DESC);
