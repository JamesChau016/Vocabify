"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { User, Credential } from "@/types";
import loginService from "@/services/login";
import listService from "@/services/list";

interface AuthContextType {
  currentUser: User | null;
  login: (creds: Credential) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("loggedInUser");
    if (stored) {
      const user: User = JSON.parse(stored);
      listService.setToken(user.token);
      setCurrentUser(user);
    }
  }, []);

  const login = async (creds: Credential) => {
    const user = await loginService.login(creds);
    listService.setToken(user.token);
    setCurrentUser(user);
    window.localStorage.setItem("loggedInUser", JSON.stringify(user));
  };

  const logout = () => {
    window.localStorage.clear();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
