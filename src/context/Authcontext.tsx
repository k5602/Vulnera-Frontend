import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { POST } from "../api/api-manage";
import endpoints from "../utils/endpoints";
import { setCsrfToken, clearCsrfToken } from "../api/api-manage";

interface User {
  user_id: string;
  email: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load session on first mount
  useEffect(() => {
    const init = async () => {
      try {
        await refreshToken(); // tries refresh & load user
      } catch {
        // no session
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Login
  const login = async (email: string, password: string) => {
    const res = await POST(endpoints.auth.login, { email, password });

    // Save CSRF token
    setCsrfToken(res.data.csrf_token);

    // Save user metadata from AuthResponse
    setUser({
      user_id: res.data.user_id,
      email: res.data.email,
      roles: res.data.roles,
    });
  };

  // Register
  const register = async (email: string, password: string) => {
    const res = await POST(endpoints.auth.register, { email, password });

    setCsrfToken(res.data.csrf_token);

    setUser({
      user_id: res.data.user_id,
      email: res.data.email,
      roles: res.data.roles,
    });
  };

  // Refresh → rehydrate session
  const refreshToken = async () => {
    try {
      const res = await POST(endpoints.auth.refresh);

      setCsrfToken(res.data.csrf_token);

      // No user info returned → you must store it manually after login
      // So we re-fetch user info from a protected endpoint IF you want.
      // Since your API has NO /me endpoint, we rely on stored user.
      if (!user) {
        // We cannot get user from backend, so keep current or null.
        // Optionally: create a dedicated /api/v1/me endpoint later.
      }
    } catch {
      clearCsrfToken();
      setUser(null);
      throw new Error("Session expired");
    }
  };

  // Logout
  const logout = async () => {
    await POST(endpoints.auth.logout);
    clearCsrfToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
