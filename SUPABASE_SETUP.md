# Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com/) and create a new project
2. Choose your organization and project name
3. Set a database password
4. Select a region close to your users

## 2. Database Schema

Run this SQL in the Supabase SQL Editor to create the reports table:

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

-- Create indexes for better performance
CREATE INDEX idx_reports_user_email ON reports(user_email);
CREATE INDEX idx_reports_nagar_nigam ON reports(nagar_nigam);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can only see their own reports
CREATE POLICY "Users can view own reports" ON reports
  FOR SELECT USING (auth.jwt() ->> 'email' = user_email);

-- Users can insert their own reports
CREATE POLICY "Users can insert own reports" ON reports
  FOR INSERT WITH CHECK (auth.jwt() ->> 'email' = user_email);

-- Municipal admins can view all reports for their nagar nigam
CREATE POLICY "Municipal admins can view reports" ON reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM municipal_admins
      WHERE municipal_admins.email = auth.jwt() ->> 'email'
      AND municipal_admins.nagar_nigam = reports.nagar_nigam
    )
  );

-- Municipal admins can update reports for their nagar nigam
CREATE POLICY "Municipal admins can update reports" ON reports
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM municipal_admins
      WHERE municipal_admins.email = auth.jwt() ->> 'email'
      AND municipal_admins.nagar_nigam = reports.nagar_nigam
    )
  );

-- Create municipal_admins table for admin access
CREATE TABLE municipal_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  nagar_nigam TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for municipal_admins
ALTER TABLE municipal_admins ENABLE ROW LEVEL SECURITY;

-- Policy for municipal admins to view their own record
CREATE POLICY "Municipal admins can view own record" ON municipal_admins
  FOR SELECT USING (auth.jwt() ->> 'email' = email);
```

## 3. Environment Variables

Add these to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 4. Add Municipal Admins

Insert municipal admin records in the SQL Editor:

```sql
-- Example: Add municipal admins
INSERT INTO municipal_admins (email, name, nagar_nigam) VALUES
('admin@ranchi.gov.in', 'Ranchi Admin', 'Ranchi Municipal Corporation'),
('admin@jamshedpur.gov.in', 'Jamshedpur Admin', 'Jamshedpur Notified Area Committee'),
('admin@dhanbad.gov.in', 'Dhanbad Admin', 'Dhanbad Municipal Corporation');
```

## 5. Features

### User Features:

- Submit reports with photos, voice notes, and location
- View all their submitted reports
- Track report status (submitted, in_progress, completed)
- Receive email notifications (to be implemented)

### Municipal Admin Features:

- View all reports for their municipal corporation
- Update report status (in_progress, completed)
- Add admin notes to reports
- Filter reports by status and category

## 6. Security

- Row Level Security (RLS) enabled
- Users can only access their own reports
- Municipal admins can only access reports for their jurisdiction
- All data is encrypted in transit and at rest
