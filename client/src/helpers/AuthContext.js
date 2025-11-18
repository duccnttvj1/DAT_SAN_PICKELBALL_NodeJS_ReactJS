import { createContext, useContext } from "react";

export const AuthContext = createContext({
  authState: {
    username: "",
    id: 0,
    role: "",
    status: false,
    isAuthLoading: true,
  },
  setAuthState: () => {},
});

export const useAuthState = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthState must be used within AuthProvider");
  }
  return context;
};
