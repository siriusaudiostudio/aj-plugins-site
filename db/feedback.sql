CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('comment', 'suggestion')),
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 10 AND 1500),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitter TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  CHECK (status <> 'approved' OR kind = 'comment')
);
CREATE INDEX IF NOT EXISTS feedback_status ON feedback(status, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_submitter ON feedback(submitter, created_at);

