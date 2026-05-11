import React from 'react';
import { Navigate } from 'react-router';
import { useAppContext } from '../context/AppContext';

/**
 * The index route. Root.tsx already redirects based on `hasEntered` and
 * `hasRoutine`; this component just provides a final safety net so any
 * direct visit to `/` ends up somewhere friendly.
 */
export function Home() {
  const { hasEntered, hasLoggedIn, hasRoutine } = useAppContext();
  if (!hasEntered) return <Navigate to="/welcome" replace />;
  if (!hasLoggedIn) return <Navigate to="/login" replace />;
  if (!hasRoutine) return <Navigate to="/setup/start-time" replace />;
  return <Navigate to="/routine" replace />;
}
