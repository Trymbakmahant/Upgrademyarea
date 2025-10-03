# Municipal Authentication Setup

## Overview

The municipal side now uses a password-based authentication system where each municipality has its own login credentials and can only see reports for their specific jurisdiction.

## Municipal Login Credentials

| Municipality | Municipal ID   | Password      |
| ------------ | -------------- | ------------- |
| Ranchi       | ranchi2024     | ranchi123     |
| Jamshedpur   | jamshedpur2024 | jamshedpur123 |
| Dhanbad      | dhanbad2024    | dhanbad123    |
| Bokaro       | bokaro2024     | bokaro123     |
| Deoghar      | deoghar2024    | deoghar123    |

## How to Use

1. **Access Municipal Login**: Go to `/auth/municipal` or click "Municipal Login" in the navigation
2. **Enter Credentials**: Use the Municipal ID and Password from the table above
3. **View Reports**: After login, you'll see only reports for your municipality
4. **Update Status**: Click on any report to update its status (submitted → in_progress → completed)
5. **Add Notes**: Include admin notes when updating status

## Security Features

- Each municipality can only see reports for their jurisdiction
- Session expires after 24 hours
- Simple password-based authentication (can be upgraded to more secure methods)

## Adding New Municipalities

To add a new municipality, update the `MUNICIPAL_CREDENTIALS` object in `/app/api/auth/municipal/route.ts`:

```typescript
newMunicipality2024: {
  password: "newpassword123",
  nagarNigam: "New Municipality Name",
  name: "New Municipality Admin",
}
```

## Production Recommendations

1. **Use Environment Variables**: Store credentials in environment variables instead of hardcoded values
2. **Hash Passwords**: Use bcrypt or similar to hash passwords
3. **Database Storage**: Store municipal credentials in a database
4. **Session Management**: Implement proper session management with JWT tokens
5. **Rate Limiting**: Add rate limiting to prevent brute force attacks
