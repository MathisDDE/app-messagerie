import axios from "axios";
import { registerRoute, loginRoute, logoutRoute, meRoute } from "../utils/APIRoutes";

// Configuration axios avec credentials
axios.defaults.withCredentials = true;

export const register = async (userData) => {
  try {
    const response = await axios.post(registerRoute, userData);
    return response.data;
  } catch (error) {
    console.error("Erreur d'inscription:", error);
    throw error;
  }
};

export const login = async (credentials) => {
  try {
    const response = await axios.post(loginRoute, credentials);
    return response.data;
  } catch (error) {
    console.error("Erreur de connexion:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    const response = await axios.post(logoutRoute);
    return response.data;
  } catch (error) {
    console.error("Erreur de déconnexion:", error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await axios.get(meRoute);
    return response.data;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    throw error;
  }
}; 
export default authService; 
