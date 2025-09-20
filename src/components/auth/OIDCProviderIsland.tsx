import React, { useEffect } from 'react';
import { AuthProvider, useAuth, type AuthProviderProps } from 'react-oidc-context';

function OIDCSessionSync() {
  const auth = useAuth();
  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      const token = (auth.user as any)?.access_token || (auth.user as any)?.id_token;
      if (token) {
        try { localStorage.setItem('vulnera_token', token); } catch {}
      }
      // redirect to the stored path after login, if any
      try {
        const next = sessionStorage.getItem('post_login_next');
        if (next) {
          sessionStorage.removeItem('post_login_next');
          const target = next.startsWith('/') ? next : '/';
          if (location.pathname !== target) {
            location.replace(target);
          }
        }
      } catch {}
    } else if (!auth.isLoading && !auth.isAuthenticated) {
      try { localStorage.removeItem('vulnera_token'); } catch {}
    }
  }, [auth.isAuthenticated, auth.isLoading, auth.user]);
  return null;
}

export default function OIDCProviderIsland() {
  const authority = import.meta.env.PUBLIC_OIDC_AUTHORITY;
  const client_id = import.meta.env.PUBLIC_OIDC_CLIENT_ID;
  const redirect_uri = (import.meta.env.PUBLIC_OIDC_REDIRECT_URI as string) || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4321');
  const scope = import.meta.env.PUBLIC_OIDC_SCOPE || 'openid profile email';
  const response_type = import.meta.env.PUBLIC_OIDC_RESPONSE_TYPE || 'code';

  const cfg: AuthProviderProps = {
    authority,
    client_id,
    redirect_uri,
    response_type,
    scope,
    automaticSilentRenew: true,
  } as AuthProviderProps;

  return (
    <AuthProvider {...cfg}>
      <OIDCSessionSync />
    </AuthProvider>
  );
}
