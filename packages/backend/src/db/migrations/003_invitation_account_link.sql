ALTER TABLE invitations ADD COLUMN school_id TEXT REFERENCES schools(id) ON DELETE SET NULL;
ALTER TABLE invitations ADD COLUMN accepted_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX invitations_accepted_user_idx ON invitations(accepted_user_id);