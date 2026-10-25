-- Prevent UPDATE/DELETE on sources table (immutable)
CREATE TRIGGER prevent_sources_update
BEFORE UPDATE ON sources
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'sources table is immutable - UPDATE not allowed');
END;

CREATE TRIGGER prevent_sources_delete
BEFORE DELETE ON sources
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'sources table is immutable - DELETE not allowed');
END;

-- Prevent UPDATE/DELETE on sync_ledger table (immutable append-only log)
CREATE TRIGGER prevent_sync_ledger_update
BEFORE UPDATE ON sync_ledger
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'sync_ledger table is immutable - UPDATE not allowed');
END;

CREATE TRIGGER prevent_sync_ledger_delete
BEFORE DELETE ON sync_ledger
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'sync_ledger table is immutable - DELETE not allowed');
END;
