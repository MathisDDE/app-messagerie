import axios from 'axios';
import { host } from '../utils/APIRoutes';

// Configuration d'axios pour inclure les cookies
axios.defaults.withCredentials = true;

// Définir la classe d'abord
class AuthService {
  constructor() {
    this.user = null;
    this.isRefreshing = false;
    this.failedQueue = [];
    this.setupInterceptors();
  }

  // Traiter la queue des requêtes en attente
  processQueue(error, token = null) {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  // Configuration des intercepteurs axios
  setupInterceptors() {
    // Intercepteur de réponse pour gérer les erreurs d'authentification
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Ne pas intercepter les requêtes vers les endpoints d'authentification
        if (
          originalRequest.url?.includes('/login') ||
          originalRequest.url?.includes('/register') ||
          originalRequest.url?.includes('/refresh') ||
          originalRequest.url?.includes('/logout') ||
          originalRequest.url?.includes('/api/auth/me')
        ) {
          return Promise.reject(error);
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Si on est déjà en train de rafraîchir, mettre la requête en attente
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(() => {
              return axios(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            // Essayer de rafraîchir le token
            await this.refreshToken();
            this.isRefreshing = false;
            this.processQueue(null);
            // Réessayer la requête originale
            return axios(originalRequest);
          } catch (refreshError) {
            this.isRefreshing = false;
            this.processQueue(refreshError, null);
            // Si le refresh échoue, rediriger vers login
            this.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Connexion
  async login(email, password) {
    try {
      const response = await axios.post(`${host}/api/auth/login`, {
        email,
        password
      });

      if (response.data.status) {
        this.user = response.data.user;
        // Stocker l'utilisateur dans le sessionStorage pour persistance côté client
        sessionStorage.setItem('user', JSON.stringify(this.user));
        return { success: true, user: this.user };
      }

      return { success: false, message: response.data.msg };
    } catch (error) {
      console.error('Erreur de connexion:', error);
      return { 
        success: false, 
        message: error.response?.data?.msg || 'Erreur de connexion' 
      };
    }
  }

  // Inscription
  async register(username, email, password) {
    try {
      const response = await axios.post(`${host}/api/auth/register`, {
        username,
        email,
        password
      });

      if (response.data.status) {
        this.user = response.data.user;
        sessionStorage.setItem('user', JSON.stringify(this.user));
        return { success: true, user: this.user };
      }

      return { success: false, message: response.data.msg };
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      return { 
        success: false, 
        message: error.response?.data?.msg || error.response?.data?.errors || 'Erreur d\'inscription' 
      };
    }
  }

  // Déconnexion
  async logout() {
    try {
      await axios.post(`${host}/api/auth/logout`);
      this.user = null;
      sessionStorage.removeItem('user');
      return { success: true };
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      // Même en cas d'erreur, on nettoie localement
      this.user = null;
      sessionStorage.removeItem('user');
      return { success: true };
    }
  }

  // Obtenir l'utilisateur actuel
  async getCurrentUser() {
    try {
      // D'abord vérifier le sessionStorage
      const storedUser = sessionStorage.getItem('user');
      if (storedUser) {
        this.user = JSON.parse(storedUser);
      }

      // Puis vérifier avec le serveur
      const response = await axios.get(`${host}/api/auth/me`);
      
      if (response.data.status) {
        this.user = response.data.user;
        sessionStorage.setItem('user', JSON.stringify(this.user));
        return { success: true, user: this.user };
      }

      return { success: false };
    } catch (error) {
      // Si c'est une erreur 401, ne pas la propager pour éviter la boucle infinie
      if (error.response?.status === 401) {
        this.user = null;
        sessionStorage.removeItem('user');
        return { success: false };
      }
      
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      this.user = null;
      sessionStorage.removeItem('user');
      return { success: false };
    }
  }

  // Rafraîchir le token
  async refreshToken() {
    try {
      const response = await axios.post(`${host}/api/auth/refresh`);
      return response.data.status;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du token:', error);
      throw error;
    }
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated() {
    return this.user !== null;
  }

  // Obtenir l'utilisateur actuel depuis la mémoire
  getUser() {
    if (!this.user) {
      const storedUser = sessionStorage.getItem('user');
      if (storedUser) {
        this.user = JSON.parse(storedUser);
      }
    }
    return this.user;
  }

  // Mettre à jour l'utilisateur en mémoire
  updateUser(userData) {
    this.user = { ...this.user, ...userData };
    sessionStorage.setItem('user', JSON.stringify(this.user));
  }
}

// Créer l'instance
const authService = new AuthService();

// Exporter les fonctions individuelles
export const login = authService.login.bind(authService);
export const register = authService.register.bind(authService);
export const logout = authService.logout.bind(authService);
export const getCurrentUser = authService.getCurrentUser.bind(authService);
export const refreshToken = authService.refreshToken.bind(authService);
export const isAuthenticated = authService.isAuthenticated.bind(authService);
export const getUser = authService.getUser.bind(authService);
export const updateUser = authService.updateUser.bind(authService);

// Exporter aussi l'instance par défaut
export default authService; 
