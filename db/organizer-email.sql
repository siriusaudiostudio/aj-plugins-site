-- Apply once to each Organizer D1 database before enabling email delivery.
CREATE TABLE IF NOT EXISTS organizer_delivery (
  order_id TEXT PRIMARY KEY REFERENCES organizer_orders(id),
  access_hash TEXT NOT NULL UNIQUE,
  token_box TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent')),
  lease_until INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  provider_id TEXT,
  last_error TEXT,
  sent_at TEXT
);
