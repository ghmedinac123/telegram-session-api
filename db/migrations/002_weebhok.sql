-- 002_webhooks.sql
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE REFERENCES telegram_sessions(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    secret VARCHAR(100),
    events TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    max_retries INT DEFAULT 3,
    timeout_ms INT DEFAULT 5000,
    last_error TEXT,
    last_error_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_webhooks_session ON webhooks(session_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_webhooks_updated ON webhooks;
CREATE TRIGGER trg_webhooks_updated BEFORE UPDATE ON webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();