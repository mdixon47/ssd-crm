-- 010_content_items.sql
-- Content publishing and distribution system.
-- Stores drafts, scheduled posts, and published content across all channels.

CREATE TABLE IF NOT EXISTS content_items (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Core content
  title           text        NOT NULL,
  body            text        NOT NULL,
  content_type    text        NOT NULL DEFAULT 'post',   -- post | email | carousel | reel | article
  platform        text        NOT NULL DEFAULT 'linkedin', -- linkedin | facebook | instagram | email | all

  -- Lifecycle
  status          text        NOT NULL DEFAULT 'draft',  -- draft | scheduled | published | archived
  scheduled_at    timestamptz,
  published_at    timestamptz,

  -- Metadata / targeting
  topic           text,
  offer           text,   -- gw101 | grants_consulting | bh_consulting | free_course | general
  tone            text,   -- educational | promotional | testimonial | story | announcement
  tags            text[]  NOT NULL DEFAULT '{}',

  -- Performance (updated after publishing)
  performance     jsonb   NOT NULL DEFAULT '{}',  -- { likes, comments, shares, clicks, leads_generated }

  -- Ownership
  created_by      uuid REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS content_items_updated_at ON content_items;
CREATE TRIGGER content_items_updated_at
  BEFORE UPDATE ON content_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS content_items_status_idx     ON content_items(status);
CREATE INDEX IF NOT EXISTS content_items_platform_idx   ON content_items(platform);
CREATE INDEX IF NOT EXISTS content_items_scheduled_idx  ON content_items(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS content_items_created_by_idx ON content_items(created_by);

-- RLS
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS content_items_select ON content_items;
CREATE POLICY content_items_select ON content_items FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS content_items_insert ON content_items;
CREATE POLICY content_items_insert ON content_items FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS content_items_update ON content_items;
CREATE POLICY content_items_update ON content_items FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS content_items_delete ON content_items;
CREATE POLICY content_items_delete ON content_items FOR DELETE TO authenticated USING (created_by = auth.uid());
