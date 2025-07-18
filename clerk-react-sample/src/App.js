import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, useUser } from '@clerk/clerk-react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import SignInPage from './components/SignInPage';
import './App.css';

function App() {
  const { isLoaded } = useUser();

  // Show loading state while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className='loading-container'>
        <div className='loading-spinner'></div>
        <p>Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className='App'>
      <Header />

      <main className='main-content'>
        <Routes>
          <Route
            path='/'
            element={
              <>
                <SignedIn>
                  <Dashboard />
                </SignedIn>
                <SignedOut>
                  <Navigate to='/sign-in' />
                </SignedOut>
              </>
            }
          />

          <Route
            path='/sign-in'
            element={
              <>
                <SignedOut>
                  <SignInPage />
                </SignedOut>
                <SignedIn>
                  <Navigate to='/' />
                </SignedIn>
              </>
            }
          />

          <Route
            path='/dashboard'
            element={
              <>
                <SignedIn>
                  <Dashboard />
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn />
                </SignedOut>
              </>
            }
          />

          {/* Catch all route */}
          <Route path='*' element={<Navigate to='/' />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
