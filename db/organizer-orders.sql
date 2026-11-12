CREATE TABLE organizer_orders (
  id TEXT PRIMARY KEY,
  access_hash TEXT NOT NULL UNIQUE,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  payment_id TEXT UNIQUE,
  machine TEXT,
  second_machine TEXT
);
