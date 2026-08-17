-- Voice notes (Sprint 66): an audio note recorded per todo list, mirroring the
-- camera check-ins. `list_id` NULLs if the list is deleted (the note survives);
-- the audio file is removed from disk when the row is deleted (see
-- commands/voice_notes.rs). `duration_ms` is the recorded length.
CREATE TABLE voice_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER REFERENCES lists(id) ON DELETE SET NULL,
    path TEXT NOT NULL,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
