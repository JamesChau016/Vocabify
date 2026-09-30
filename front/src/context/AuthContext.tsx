"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { User, Credential, RegisterCredential } from "@/types";
import loginService from "@/services/login";
import userService from "@/services/user";
import authService from "@/services/auth";
import listService from "@/services/list";

interface AuthContextType {
  currentUser: User | null;
  register: (creds: RegisterCredential) => Promise<void>;
  login: (creds: Credential) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("loggedInUser");
    if (stored) {
      const user: User = JSON.parse(stored);
      listService.setToken(user.token);
      authService.setToken(user.token);
      setCurrentUser(user);
    }
  }, []);

  const register = async (creds: RegisterCredential) => {
    // Create the account only. Do NOT auto-authenticate here; the register
    // page navigates the user to the sign-in interface afterwards.
    await userService.create(creds);
  };

  const login = async (creds: Credential) => {
    const user = await loginService.login(creds);
    listService.setToken(user.token);
    authService.setToken(user.token);
    setCurrentUser(user);
    window.localStorage.setItem("loggedInUser", JSON.stringify(user));
  };

  const logout = async () => {
    // Invalidate the session server-side first. Only clear local state on
    // success; if the API call fails, retain the session and surface the
    // error so the caller can display it.
    await authService.logout();
    window.localStorage.clear();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
