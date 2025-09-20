import React from 'react';
import { useAuth } from 'react-oidc-context';

export function OIDCSignInButton() {
  const auth = useAuth();

  const handleSignIn = () => {
    // Store current path for post-login redirect
    try {
      const params = new URLSearchParams(location.search);
      const next = params.get('next') || '/dashboard';
      sessionStorage.setItem('post_login_next', next);
    } catch {}
    
    auth.signinRedirect();
  };

  if (auth.isLoading) {
    return (
      <button disabled className="w-full inline-flex items-center justify-center bg-gradient-to-r from-cyber-600 to-matrix-600 opacity-70 text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-bold font-mono text-sm sm:text-base">
        <span className="mr-2">&gt;</span> LOADING...
      </button>
    );
  }

  if (auth.isAuthenticated) {
    return null; // Hide sign-in if already authenticated
  }

  return (
    <button 
      onClick={handleSignIn}
      className="w-full inline-flex items-center justify-center bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-bold font-mono transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 text-sm sm:text-base"
    >
      <span className="mr-2">&gt;</span> SIGN_IN_WITH_SSO
    </button>
  );
}

export function OIDCSignOutButton() {
  const auth = useAuth();

  const handleSignOut = () => {
    // Clear local storage
    try {
      localStorage.removeItem('vulnera_token');
      localStorage.removeItem('token');
    } catch {}
    
    // Sign out via OIDC
    auth.removeUser();
    
    // Optional: redirect to logout URL if configured
    const clientId = import.meta.env.PUBLIC_OIDC_CLIENT_ID || '7bb2lbked99q8m9knnh2c4coe';
    const logoutUri = import.meta.env.PUBLIC_OIDC_LOGOUT_URI;
    const cognitoDomain = import.meta.env.PUBLIC_OIDC_LOGOUT_DOMAIN;
    
    if (cognitoDomain && logoutUri) {
      window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
    } else {
      // Fallback: redirect to home
      window.location.href = '/';
    }
  };

  if (!auth.isAuthenticated) {
    return null;
  }

  return (
    <button 
      onClick={handleSignOut}
      className="inline-flex items-center border border-red-400/40 text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg font-mono text-xs transition-colors"
    >
      SIGN_OUT
    </button>
  );
}

export function OIDCUserInfo() {
  const auth = useAuth();

  if (!auth.isAuthenticated || !auth.user) {
    return null;
  }

  const email = (auth.user as any)?.profile?.email || 'Unknown';

  return (
    <div className="text-xs text-cyber-300 font-mono">
      Welcome: {email}
    </div>
  );
}
