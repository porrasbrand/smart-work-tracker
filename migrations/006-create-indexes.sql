CREATE INDEX idx_sources_session_id ON sources(session_id);
CREATE INDEX idx_sources_status ON sources(status);
CREATE INDEX idx_segments_source_id ON segments(source_id);
CREATE INDEX idx_segments_status ON segments(status);
CREATE INDEX idx_segments_project_id_final ON segments(project_id_final);
CREATE INDEX idx_sync_ledger_segment_id ON sync_ledger(segment_id);
CREATE INDEX idx_task_links_segment_id ON task_links(segment_id);
