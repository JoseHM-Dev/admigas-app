// Archivo: src/auth/useAuth.jsx
import { createContext, useContext } from "react";

// 1. Creamos el contexto
export const AuthContext = createContext();

// 2. Exportamos el hook personalizado para usarlo en los componentes
export const useAuth = () => {
  return useContext(AuthContext);
};