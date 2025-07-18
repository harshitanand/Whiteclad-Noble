import React, { useState, useEffect } from 'react';
import { useAuth, useUser, useOrganization } from '@clerk/clerk-react';
import ApiService from '../services/api';

const Dashboard = () => {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const { organization } = useOrganization();

  const [sessionToken, setSessionToken] = useState(null);
  const [apiResponses, setApiResponses] = useState({});
  const [loading, setLoading] = useState({});

  // Get session token on component mount
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await getToken();
        setSessionToken(token);
        // Set the token for API requests
        ApiService.setAuthToken(token);
      } catch (error) {
        console.error('Failed to get session token:', error);
      }
    };

    if (userId) {
      fetchToken();
    }
  }, [getToken, userId]);

  // Generic function to make API calls and handle responses
  const makeApiCall = async (apiFunction, buttonKey, ...args) => {
    setLoading((prev) => ({ ...prev, [buttonKey]: true }));

    try {
      const result = await apiFunction(...args);
      setApiResponses((prev) => ({
        ...prev,
        [buttonKey]: {
          success: result.success,
          data: result.data,
          error: result.error,
          status: result.status,
          timestamp: new Date().toLocaleTimeString(),
        },
      }));
    } catch (error) {
      setApiResponses((prev) => ({
        ...prev,
        [buttonKey]: {
          success: false,
          error: error.message,
          timestamp: new Date().toLocaleTimeString(),
        },
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [buttonKey]: false }));
    }
  };

  const handleRefreshToken = async () => {
    try {
      const newToken = await getToken({ forceRefresh: true });
      setSessionToken(newToken);
      ApiService.setAuthToken(newToken);
      alert('Token refreshed successfully!');
    } catch (error) {
      console.error('Failed to refresh token:', error);
      alert('Failed to refresh token');
    }
  };

  const copyTokenToClipboard = () => {
    if (sessionToken) {
      navigator.clipboard.writeText(sessionToken);
      alert('Token copied to clipboard!');
    }
  };

  return (
    <div className='dashboard'>
      <h2>🎛️ AI Agents Dashboard</h2>

      <div className='dashboard-grid'>
        {/* User Information Card */}
        <div className='dashboard-card'>
          <h3>👤 User Information</h3>
          <div className='user-details'>
            <h4>Clerk User Details</h4>
            <p>
              <strong>User ID:</strong> {userId}
            </p>
            <p>
              <strong>Email:</strong> {user?.primaryEmailAddress?.emailAddress}
            </p>
            <p>
              <strong>Name:</strong> {user?.firstName} {user?.lastName}
            </p>
            <p>
              <strong>Created:</strong>{' '}
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </p>

            {organization && (
              <>
                <h4>Organization Details</h4>
                <p>
                  <strong>Org ID:</strong> {organization.id}
                </p>
                <p>
                  <strong>Org Name:</strong> {organization.name}
                </p>
                <p>
                  <strong>Role:</strong> {organization.membership?.role}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Session Token Card */}
        <div className='dashboard-card'>
          <h3>🔐 Session Token</h3>
          <p>This is your current Clerk session token that will be sent to the backend API:</p>

          <div className='token-display'>
            {sessionToken ? (
              <div>
                <strong>Token (first 50 characters):</strong>
                <br />
                {sessionToken.substring(0, 50)}...
                <br />
                <br />
                <strong>Full Token Length:</strong> {sessionToken.length} characters
              </div>
            ) : (
              'Loading token...'
            )}
          </div>

          <div className='api-buttons'>
            <button className='api-btn' onClick={handleRefreshToken} disabled={!sessionToken}>
              🔄 Refresh Token
            </button>
            <button className='api-btn' onClick={copyTokenToClipboard} disabled={!sessionToken}>
              📋 Copy Token
            </button>
          </div>
        </div>
      </div>

      {/* API Testing Section */}
      <div className='api-section'>
        <h3>🧪 API Testing</h3>
        <p>Test your backend API endpoints with the current session token:</p>

        <div className='api-buttons'>
          <button
            className={`api-btn ${apiResponses.health?.success ? 'success' : apiResponses.health?.success === false ? 'error' : ''}`}
            onClick={() => makeApiCall(ApiService.testConnection, 'health')}
            disabled={loading.health || !sessionToken}
          >
            {loading.health ? '⏳' : '🏥'} Health Check
          </button>

          <button
            className={`api-btn ${apiResponses.user?.success ? 'success' : apiResponses.user?.success === false ? 'error' : ''}`}
            onClick={() => makeApiCall(ApiService.getCurrentUser, 'user')}
            disabled={loading.user || !sessionToken}
          >
            {loading.user ? '⏳' : '👤'} Get User Profile
          </button>

          <button
            className={`api-btn ${apiResponses.org?.success ? 'success' : apiResponses.org?.success === false ? 'error' : ''}`}
            onClick={() => makeApiCall(ApiService.getCurrentOrganization, 'org')}
            disabled={loading.org || !sessionToken}
          >
            {loading.org ? '⏳' : '🏢'} Get Organization
          </button>

          <button
            className={`api-btn ${apiResponses.agents?.success ? 'success' : apiResponses.agents?.success === false ? 'error' : ''}`}
            onClick={() => makeApiCall(ApiService.getAgents, 'agents')}
            disabled={loading.agents || !sessionToken}
          >
            {loading.agents ? '⏳' : '🤖'} Get Agents
          </button>

          <button
            className={`api-btn ${apiResponses.billing?.success ? 'success' : apiResponses.billing?.success === false ? 'error' : ''}`}
            onClick={() => makeApiCall(ApiService.getBillingInfo, 'billing')}
            disabled={loading.billing || !sessionToken}
          >
            {loading.billing ? '⏳' : '💳'} Get Billing Info
          </button>
        </div>

        {/* API Responses */}
        {Object.entries(apiResponses).map(([key, response]) => (
          <div key={key} className={`api-response ${response.success ? 'success' : 'error'}`}>
            <h4>
              {key.toUpperCase()} Response
              <span style={{ fontSize: '0.8em', fontWeight: 'normal' }}>
                ({response.timestamp})
              </span>
            </h4>
            <pre>
              {response.success
                ? JSON.stringify(response.data, null, 2)
                : `Error ${response.status || ''}: ${response.error}`}
            </pre>
          </div>
        ))}
      </div>

      {/* Quick API Examples */}
      <div className='dashboard-card'>
        <h3>📖 API Usage Examples</h3>
        <p>Here's how to make authenticated requests to your backend:</p>

        <div className='token-display'>
          <strong>JavaScript/Axios Example:</strong>
          <pre>{`
// Get token from Clerk
const token = await getToken();

// Make authenticated request
const response = await axios.get('${process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1'}/agents', {
  headers: {
    'Authorization': \`Bearer \${token}\`,
    'Content-Type': 'application/json'
  }
});
          `}</pre>
        </div>

        <div className='token-display'>
          <strong>cURL Example:</strong>
          <pre>{`
curl -X GET "${process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1'}/agents" \\
  -H "Authorization: Bearer YOUR_SESSION_TOKEN_HERE" \\
  -H "Content-Type: application/json"
          `}</pre>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
