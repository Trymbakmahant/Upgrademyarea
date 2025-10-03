# Google Maps Setup

## 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Maps JavaScript API
   - Places API (optional, for enhanced features)
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy your API key

## 2. Configure Environment Variables

Create or update your `.env.local` file in the project root:

```bash
# Google Maps API Key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

## 3. API Key Restrictions (Recommended)

For security, restrict your API key:

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Click on your API key
3. Under "Application restrictions":
   - Select "HTTP referrers (web sites)"
   - Add your domain: `localhost:3000/*` (for development)
   - Add your production domain: `yourdomain.com/*`
4. Under "API restrictions":
   - Select "Restrict key"
   - Choose: Maps JavaScript API, Places API

## 4. Features Implemented

- ✅ Interactive maps for each report location
- ✅ Custom red marker for report locations
- ✅ Zoom controls and fullscreen option
- ✅ Location accuracy display
- ✅ Reporter identity hidden for safety
- ✅ Report ID shown instead of name

## 5. Usage

The GoogleMap component is automatically used in the municipal dashboard to show the exact location of each reported issue. Municipal staff can:

- View precise location of issues
- Use map controls to zoom and navigate
- See location accuracy information
- Update report status without seeing reporter identity

## 6. Cost Considerations

- Google Maps API has a free tier (28,000 map loads per month)
- Each map view counts as one load
- Monitor usage in Google Cloud Console
- Consider implementing map caching for high-traffic scenarios
