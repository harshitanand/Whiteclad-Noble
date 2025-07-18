import React from 'react';
import { SignIn } from '@clerk/clerk-react';

const SignInPage = () => {
  return (
    <div className='sign-in-page'>
      <div className='sign-in-card'>
        <h2>Welcome to AI Agents Platform</h2>
        <p>Sign in to access your AI agents and manage your organization.</p>

        <SignIn
          redirectUrl='/'
          appearance={{
            elements: {
              formButtonPrimary: {
                backgroundColor: '#667eea',
                '&:hover': {
                  backgroundColor: '#764ba2',
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default SignInPage;
