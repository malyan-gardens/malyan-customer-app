ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated full access" ON inventory;
CREATE POLICY "authenticated full access" ON inventory
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);
