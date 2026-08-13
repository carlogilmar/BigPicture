-- Sprint 64: per-card tags for feedback boards. Stored as a single
-- space-separated string of tag words (no leading '#'); the frontend
-- splits + renders them as colored badges on the card.
ALTER TABLE feedback_cards ADD COLUMN tags TEXT NOT NULL DEFAULT '';
