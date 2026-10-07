"use client";

import axios from "axios";
import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { User, Credential, RegisterCredential } from "@/types";
import authService from "@/services/auth";
import userService from "@/services/user";

// Send cookies with every request
axios.defaults.withCredentials = true;

interface AuthContextType {
  currentUser: User | null;
  sessionLoading: boolean;
  register: (creds: RegisterCredential) => Promise<void>;
  login: (creds: Credential) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Restore session from the HttpOnly cookie via /me
  useEffect(() => {
    authService.me()
      .then((user) => setCurrentUser(user))
      .catch(() => setCurrentUser(null))
      .finally(() => setSessionLoading(false));
  }, []);

  const register = async (creds: RegisterCredential) => {
    await userService.create(creds);
  };

  const login = async (creds: Credential) => {
    const user = await authService.login(creds);
    setCurrentUser(user);
  };

  const logout = async () => {
    await authService.logout();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, sessionLoading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
