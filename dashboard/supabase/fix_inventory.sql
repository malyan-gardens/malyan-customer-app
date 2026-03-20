ALTER TABLE inventory ADD COLUMN IF NOT EXISTS purchase_price numeric(10,2) DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cost_price numeric(10,2) DEFAULT 0;
DROP POLICY IF EXISTS "Auth users manage inventory" ON inventory;
CREATE POLICY "Auth users manage inventory" ON inventory FOR ALL USING (auth.role() = 'authenticated');
