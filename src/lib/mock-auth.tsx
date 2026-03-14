
'use client';
import React from 'react';

/**
 * DEPRECATED: This file is no longer used. 
 * Authentication is now handled by @/firebase hooks.
 * This dummy export remains to prevent manifest errors from stale build references.
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const useAuth = () => {
  return {
    user: null,
    loading: false,
    login: () => {},
    logout: () => {},
  };
};
