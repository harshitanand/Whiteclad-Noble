# Clerk React Sample - AI Agents Platform

This is a sample React application that demonstrates how to integrate with Clerk authentication and obtain session tokens to make authenticated API calls to your AI Agents Platform backend.

## Features

- 🔐 Clerk authentication integration
- 🎯 Session token management and display
- 🧪 Interactive API testing with real backend endpoints
- 📱 Responsive design with modern UI
- 🔄 Token refresh functionality
- 📋 Copy token to clipboard
- 🏥 Health check and API status monitoring

## Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- Your AI Agents Platform backend running (default: http://localhost:3000)
- Clerk account and application set up

### 2. Clone and Install

```bash
git clone <repository-url>
cd clerk-react-sample
npm install
```

### 3. Environment Setup

1. Copy the environment example file:
```bash
cp env.example .env.local
```

2. Configure your environment variables in `.env.local`:
```env
# Clerk Configuration
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Backend API URL
REACT_APP_API_URL=http://localhost:3000/api/v1

# Optional: Organization ID for multi-tenant setup
REACT_APP_DEFAULT_ORG_ID=your_org_id_here
```

### 4. Get Your Clerk Keys

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Select your application
3. Go to **API Keys** section
4. Copy the **Publishable Key** (starts with `pk_test_` or `pk_live_`)
5. Paste it in your `.env.local` file

### 5. Run the Application

```bash
npm start
```

The app will start at http://localhost:3001 (or next available port).

## How It Works

### Authentication Flow

1. **Initial Load**: App checks if user is authenticated
2. **Sign In**: User signs in through Clerk's hosted UI
3. **Token Generation**: Clerk generates a session token
4. **API Calls**: Token is used to authenticate backend requests

### Key Components

#### Dashboard Component
- Displays user information from Clerk
- Shows current session token
- Provides interactive API testing buttons
- Displays API responses in real-time

#### API Service
- Handles all backend API communication
- Automatically includes authentication headers
- Provides error handling and response formatting

### Session Token Usage

The app demonstrates how to:

1. **Get Session Token**:
```javascript
import { useAuth } from '@clerk/clerk-react';

const { getToken } = useAuth();
const token = await getToken();
```

2. **Make Authenticated API Calls**:
```javascript
const response = await axios.get('/api/v1/agents', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

3. **Refresh Token**:
```javascript
const newToken = await getToken({ forceRefresh: true });
```

## API Endpoints Tested

The sample app tests these backend endpoints:

- `GET /api/v1/health` - Health check
- `GET /api/v1/users/me` - Current user profile
- `GET /api/v1/organizations/current` - Current organization
- `GET /api/v1/agents` - List agents
- `GET /api/v1/billing/info` - Billing information

## Configuration Options

### Clerk Configuration

The app uses these Clerk features:

- **ClerkProvider**: Wraps the entire app
- **SignIn**: Hosted sign-in component
- **UserButton**: User profile dropdown
- **useAuth**: Hook for authentication state
- **useUser**: Hook for user data
- **useOrganization**: Hook for organization data

### API Configuration

Configure the backend API URL:

```javascript
// In src/services/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';
```

## Customization

### Styling

Modify `src/App.css` to change the appearance:

- Colors and gradients
- Component spacing and layout
- Responsive breakpoints
- Button styles and animations

### API Endpoints

Add new API endpoints in `src/services/api.js`:

```javascript
// Add new method to ApiService class
async getNewEndpoint() {
  try {
    const response = await apiClient.get('/new-endpoint');
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

Then use it in the Dashboard component:

```javascript
<button onClick={() => makeApiCall(ApiService.getNewEndpoint, 'newEndpoint')}>
  Test New Endpoint
</button>
```

## Troubleshooting

### Common Issues

1. **"Missing Publishable Key" Error**
   - Make sure `.env.local` exists and has the correct Clerk key
   - Restart the development server after adding environment variables

2. **API Calls Failing**
   - Ensure your backend server is running
   - Check the API URL in environment variables
   - Verify the backend accepts the Clerk token format

3. **CORS Issues**
   - Make sure your backend CORS configuration allows requests from `http://localhost:3001`
   - Check the backend logs for CORS-related errors

4. **Token Not Working**
   - Try refreshing the token using the "Refresh Token" button
   - Check if the token is being sent in the Authorization header
   - Verify the backend JWT verification is working correctly

### Debug Tips

1. **Check Network Tab**: Open browser dev tools and check the Network tab for API requests
2. **Console Logs**: Check browser console for JavaScript errors
3. **Token Inspection**: Copy the token and decode it at [jwt.io](https://jwt.io) to inspect its contents

## Security Notes

- Never expose your Clerk Secret Key in frontend code
- Always use HTTPS in production
- Implement proper CORS configuration
- Session tokens expire automatically for security

## Production Deployment

For production deployment:

1. Use production Clerk keys (`pk_live_` prefix)
2. Update `REACT_APP_API_URL` to your production backend URL
3. Build the app: `npm run build`
4. Deploy the `build` folder to your hosting provider

## Support

- [Clerk Documentation](https://clerk.com/docs)
- [React Documentation](https://reactjs.org/docs)
- [Axios Documentation](https://axios-http.com/docs/intro)

## License

MIT License - see LICENSE file for details.
