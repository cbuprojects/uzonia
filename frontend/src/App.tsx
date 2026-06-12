import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import LoginPage from './components/login';
import CalculationsPage from './components/calculations';

import BankNamesPage from './components/user_pages/banks';
import HolidaysPage from './components/user_pages/holidays';
import UzoniaDataPage from './components/user_pages/uzonia_data';
import UzoniaUploadsPage from './components/user_pages/uploads';
import RepoDataPage from './components/user_pages/repos';
import DepoDataPage from './components/user_pages/depos';

import AdminUsersPage from './components/admin_pages/user_data';
import AdminSessionsPage from './components/admin_pages/user_sessions';
import AdminActionsPage from './components/admin_pages/user_actions';

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/** Returns true when a session token is stored. */
const isAuthenticated = () => Boolean(localStorage.getItem('session_id'));

/**
 * Returns the Authorization header value for API calls throughout the app.
 * Usage:  fetch('/api/...', { headers: { Authorization: authHeader() } })
 */
export const authHeader = () => `Bearer ${localStorage.getItem('session_id') ?? ''}`;

/** Call this to sign out from anywhere in the app. */
export const logout = () => {
  localStorage.removeItem('session_id');
  window.location.href = '/login';
};

// ---------------------------------------------------------------------------
// ProtectedRoute
// ---------------------------------------------------------------------------

/**
 * Wraps any route that requires authentication.
 * If the user has no token they are sent to /login.
 * The current path is saved so we can redirect back after login (optional).
 *
 * The middleware on the backend will also reject requests with an invalid /
 * expired token and return 401/403. You should handle those responses in your
 * API utility layer (e.g. intercept 401 → call logout()) so the user is
 * sent back to the login page automatically on session expiry.
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  if (!isAuthenticated()) {
    // Preserve the attempted URL so we can redirect back after login if desired
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const App = () => {
  return (
    <Router>
      <Routes>
        {/* ── Public routes ── */}
        <Route path="/login" element={<LoginPage />} />

        {/* ── Protected routes ── */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <CalculationsPage />
            </ProtectedRoute>
          }
        />

        {/* Database Management */}
        <Route path="/banks" element={<ProtectedRoute><BankNamesPage /></ProtectedRoute>} />
        <Route path="/holidays" element={<ProtectedRoute><HolidaysPage /></ProtectedRoute>} />
        <Route path="/data" element={<ProtectedRoute><UzoniaDataPage /></ProtectedRoute>} />
        <Route path="/uploads" element={<ProtectedRoute><UzoniaUploadsPage /></ProtectedRoute>} />
        <Route path="/repo" element={<ProtectedRoute><RepoDataPage /></ProtectedRoute>} />
        <Route path="/depo" element={<ProtectedRoute><DepoDataPage /></ProtectedRoute>} />

        <Route path="/users_data" element={<ProtectedRoute><AdminUsersPage /> </ProtectedRoute>} />
        <Route path="/user_sessions" element={<ProtectedRoute><AdminSessionsPage /> </ProtectedRoute>} />
        <Route path="/user_actions" element={<ProtectedRoute><AdminActionsPage /> </ProtectedRoute>} />

        {/* Fallback: unknown paths → login if unauthed, home if authed */}
        <Route
          path="*"
          element={isAuthenticated() ? <Navigate to="/" replace /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </Router>
  );
};

export default App;