import React from 'react';
import { AppRoutes } from './AppRoutes';
import { useAuth } from './context/AuthContext';

export function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neo-bg flex items-center justify-center font-black text-2xl text-neo-ink/50">
        Initializing JuryFlow Platform...
      </div>
    );
  }

  return (
    <div className="app-root min-h-screen">
      <AppRoutes />
    </div>
  );
}

export default App;
