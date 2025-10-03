# Supabase Storage Setup

## 1. Create Storage Buckets

In your Supabase dashboard → Storage, create these buckets:

### Bucket 1: `report-images`

- **Public**: Yes
- **File size limit**: 10MB
- **Allowed MIME types**: image/jpeg, image/png, image/webp

### Bucket 2: `voice-notes`

- **Public**: Yes
- **File size limit**: 5MB
- **Allowed MIME types**: audio/wav, audio/mp3, audio/mpeg

## 2. Storage Policies

Run this SQL in Supabase SQL Editor:

```sql
-- Allow authenticated users to upload images
CREATE POLICY "Users can upload images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'report-images'
  AND auth.role() = 'authenticated'
);

-- Allow public access to view images
CREATE POLICY "Public can view images" ON storage.objects
FOR SELECT USING (bucket_id = 'report-images');

-- Allow authenticated users to upload voice notes
CREATE POLICY "Users can upload voice notes" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'voice-notes'
  AND auth.role() = 'authenticated'
);

-- Allow public access to view voice notes
CREATE POLICY "Public can view voice notes" ON storage.objects
FOR SELECT USING (bucket_id = 'voice-notes');
```

## 3. Update Database Schema

Update your reports table to store URLs instead of base64:

```sql
-- The images and voice_note columns should store URLs, not base64
-- This is already correct in your current schema
```

## 4. Benefits of This Approach

- ✅ **Faster loading** - Images served from CDN
- ✅ **Smaller database** - Only URLs stored, not file data
- ✅ **Better performance** - Optimized image delivery
- ✅ **Scalable** - Can handle large files efficiently
- ✅ **Cost effective** - Supabase Storage is cheaper than database storage

## 5. File Structure in Storage

```
report-images/
  ├── report-uuid-1/
  │   ├── image_0.jpg
  │   ├── image_1.jpg
  │   └── image_2.jpg
  └── report-uuid-2/
      └── image_0.jpg

voice-notes/
  ├── report-uuid-1/
  │   └── voice_note.wav
  └── report-uuid-2/
      └── voice_note.wav
```
