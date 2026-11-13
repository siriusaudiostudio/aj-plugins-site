CREATE TABLE IF NOT EXISTS organizer_metric_events (
  kind TEXT NOT NULL CHECK(kind IN ('sale', 'refund', 'download')),
  event_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  PRIMARY KEY(kind, event_id)
);
CREATE INDEX IF NOT EXISTS organizer_metric_period ON organizer_metric_events(kind, occurred_at);

-- Older refunds have the timestamp of their last recorded notification.
INSERT OR IGNORE INTO organizer_metric_events(kind, event_id, occurred_at)
SELECT 'refund', order_id, updated_at FROM organizer_access_blocks WHERE reason = 'refunded';

CREATE TRIGGER IF NOT EXISTS organizer_metric_sale
AFTER UPDATE OF payment_id ON organizer_orders
WHEN OLD.payment_id IS NULL AND NEW.payment_id IS NOT NULL
BEGIN
  INSERT OR IGNORE INTO organizer_metric_events VALUES ('sale', NEW.id, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;

CREATE TRIGGER IF NOT EXISTS organizer_metric_refund_insert
AFTER INSERT ON organizer_access_blocks WHEN NEW.reason = 'refunded'
BEGIN
  INSERT OR IGNORE INTO organizer_metric_events VALUES ('refund', NEW.order_id, NEW.updated_at);
END;

CREATE TRIGGER IF NOT EXISTS organizer_metric_refund_update
AFTER UPDATE ON organizer_access_blocks WHEN NEW.reason = 'refunded'
BEGIN
  INSERT OR IGNORE INTO organizer_metric_events VALUES ('refund', NEW.order_id, NEW.updated_at);
END;
