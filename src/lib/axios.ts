import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

// Créer une instance d'Axios avec une configuration de base
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important pour les cookies de session
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user?.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs
type ErrorResponse = {
  response?: {
    status: number;
    data: {
      message?: string;
      error?: string;
    };
  };
  message?: string;
};

api.interceptors.response.use(
  (response) => response,
  async (error: ErrorResponse) => {
    const originalRequest = error.config;
    
    // Si l'erreur est 401 et qu'on n'a pas déjà tenté de rafraîchir le token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Tenter de rafraîchir le token
        const response = await axios.post('http://localhost:8000/api/refresh-token', {}, {
          withCredentials: true
        });
        
        const { token } = response.data;
        
        // Mettre à jour le token dans le localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...user, token }));
        
        // Mettre à jour le header d'autorisation
        originalRequest.headers.Authorization = `Bearer ${token}`;
        
        // Renvoyer la requête originale avec le nouveau token
        return api(originalRequest);
      } catch (error) {
        // En cas d'échec de rafraîchissement, déconnecter l'utilisateur
        const { logout } = useAuth();
        logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
