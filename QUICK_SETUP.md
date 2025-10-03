# Quick Setup Guide

## 1. Create Supabase Tables

Go to your Supabase project → SQL Editor and run this SQL:

```sql
-- Create reports table
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  images TEXT[] NOT NULL,
  location JSONB NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  nagar_nigam TEXT NOT NULL,
  voice_note TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_notes TEXT
);

-- Create municipal_admins table
CREATE TABLE municipal_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  nagar_nigam TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_reports_user_email ON reports(user_email);
CREATE INDEX idx_reports_nagar_nigam ON reports(nagar_nigam);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipal_admins ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Users can insert own reports" ON reports
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

CREATE POLICY "Municipal admins can view reports" ON reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM municipal_admins
      WHERE municipal_admins.email = auth.jwt() ->> 'email'
      AND municipal_admins.nagar_nigam = reports.nagar_nigam
    )
  );

CREATE POLICY "Municipal admins can update reports" ON reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM municipal_admins
      WHERE municipal_admins.email = auth.jwt() ->> 'email'
      AND municipal_admins.nagar_nigam = reports.nagar_nigam
    )
  );

CREATE POLICY "Municipal admins can view own record" ON municipal_admins
  FOR SELECT USING (auth.jwt() ->> 'email' = email);

-- Add sample municipal admin (replace with your email)
INSERT INTO municipal_admins (email, name, nagar_nigam) VALUES
('your-email@gmail.com', 'Your Name', 'Ranchi Municipal Corporation');
```

## 2. Environment Variables

Add to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 3. Restart Server

```bash
npm run dev
```

## 4. Test

1. Sign in with Google
2. Submit a report
3. Check your dashboard
4. Access municipal page (if you're an admin)
