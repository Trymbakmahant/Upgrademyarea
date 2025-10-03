# Google OAuth Setup Guide

To enable Google authentication for UpgradeMyArea, follow these steps:

## 1. Create Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google` (for development)
     - `https://yourdomain.com/api/auth/callback/google` (for production)

## 2. Environment Variables

Create a `.env.local` file in the client directory with:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## 3. Generate NextAuth Secret

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

## 4. Features Enabled

With Google authentication, users can:

- Sign in with their Google account
- Submit reports with their email attached
- Receive email notifications about report status updates
- Track their submitted reports

## 5. Email Notifications

The system is set up to send email notifications to users when:

- Their report is received and acknowledged
- The report status changes (in progress, completed, etc.)
- The report is resolved

The user's Google email address is automatically captured and used for notifications.
