import React from 'react';
import { SignedIn, SignedOut, UserButton, useUser } from '@clerk/clerk-react';

const Header = () => {
  const { user } = useUser();

  return (
    <header className='header'>
      <div className='header-content'>
        <h1>🤖 AI Agents Platform</h1>

        <div className='header-user'>
          <SignedIn>
            <div className='user-info'>
              <span>Welcome, {user?.firstName || 'User'}!</span>
              <UserButton afterSignOutUrl='/sign-in' />
            </div>
          </SignedIn>

          <SignedOut>
            <div className='user-info'>
              <span>Please sign in to continue</span>
            </div>
          </SignedOut>
        </div>
      </div>
    </header>
  );
};

export default Header;
