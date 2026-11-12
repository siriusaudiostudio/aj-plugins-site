-- Additive migration; existing activation codes and machine assignments stay valid.
CREATE TABLE IF NOT EXISTS organizer_recovery_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS organizer_orders_email ON organizer_orders(lower(buyer_email));
CREATE TABLE IF NOT EXISTS organizer_email_status (
  order_id TEXT PRIMARY KEY,
  provider_id TEXT,
  state TEXT NOT NULL,
  checked_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS organizer_access_blocks (
  order_id TEXT PRIMARY KEY REFERENCES organizer_orders(id),
  reason TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
