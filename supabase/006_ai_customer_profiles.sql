CREATE TABLE IF NOT EXISTS ai_customer_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message_count INTEGER DEFAULT 0,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  last_topic TEXT,
  preferred_language TEXT DEFAULT 'ar',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE ai_customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON ai_customer_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own profile"
  ON ai_customer_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON ai_customer_profiles FOR UPDATE
  USING (auth.uid() = user_id);
