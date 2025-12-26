-- Migration: Search Documents indexer
-- Creates a centralized search_documents table and indexers for plans, deeds and certificates

CREATE TABLE IF NOT EXISTS apr.search_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  title TEXT,
  body TEXT,
  tsv tsvector,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (entity_type, entity_id)
);

-- GIN index for fast full text search
CREATE INDEX IF NOT EXISTS idx_search_documents_tsv ON apr.search_documents USING GIN(tsv);

-- Upsert function to populate search_documents
CREATE OR REPLACE FUNCTION apr.upsert_search_document(p_entity_type TEXT, p_entity_id UUID, p_title TEXT, p_body TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO apr.search_documents(entity_type, entity_id, title, body, tsv, updated_at)
  VALUES (
    p_entity_type,
    p_entity_id,
    p_title,
    p_body,
    to_tsvector('simple', coalesce(p_title,'') || ' ' || coalesce(p_body,'')),
    NOW()
  )
  ON CONFLICT (entity_type, entity_id) DO UPDATE
  SET title = EXCLUDED.title,
      body = EXCLUDED.body,
      tsv = EXCLUDED.tsv,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Search function (RPC)
CREATE OR REPLACE FUNCTION apr.search_documents_query(p_q TEXT, p_limit INT DEFAULT 10)
RETURNS SETOF apr.search_documents AS $$
  SELECT * FROM apr.search_documents
  WHERE tsv @@ plainto_tsquery('simple', p_q)
  ORDER BY ts_rank(tsv, plainto_tsquery('simple', p_q)) DESC, updated_at DESC
  LIMIT p_limit;
$$ LANGUAGE SQL STABLE;

-- Indexers: trigger functions for plans, deeds and digital_signatures
CREATE OR REPLACE FUNCTION apr.index_plan_search_trigger() RETURNS TRIGGER AS $$
BEGIN
  PERFORM apr.upsert_search_document('plan', NEW.id, NEW.title, COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION apr.index_deed_search_trigger() RETURNS TRIGGER AS $$
BEGIN
  PERFORM apr.upsert_search_document('deed', NEW.id, COALESCE(NEW.reference, ''), COALESCE(NEW.owner_name, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION apr.index_certificate_search_trigger() RETURNS TRIGGER AS $$
BEGIN
  PERFORM apr.upsert_search_document('certificate', NEW.id, COALESCE(NEW.signer_name, ''), COALESCE(NEW.document_hash, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers
DROP TRIGGER IF EXISTS trigger_index_plan_search ON apr.sectional_scheme_plans;
CREATE TRIGGER trigger_index_plan_search
  AFTER INSERT OR UPDATE ON apr.sectional_scheme_plans
  FOR EACH ROW EXECUTE FUNCTION apr.index_plan_search_trigger();

DROP TRIGGER IF EXISTS trigger_index_deed_search ON apr.deeds;
CREATE TRIGGER trigger_index_deed_search
  AFTER INSERT OR UPDATE ON apr.deeds
  FOR EACH ROW EXECUTE FUNCTION apr.index_deed_search_trigger();

DROP TRIGGER IF EXISTS trigger_index_certificate_search ON apr.digital_signatures;
CREATE TRIGGER trigger_index_certificate_search
  AFTER INSERT OR UPDATE ON apr.digital_signatures
  FOR EACH ROW EXECUTE FUNCTION apr.index_certificate_search_trigger();
