import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // D'abord vérifier s'il y a un utilisateur en mémoire/session
        const storedUser = authService.getUser();
        
        if (storedUser) {
          // Si on a un utilisateur en session, on le considère comme authentifié
          setIsAuthenticated(true);
          setUser(storedUser);
          setIsLoading(false);
          
          // Puis on vérifie avec le serveur en arrière-plan
          const result = await authService.getCurrentUser();
          if (!result.success) {
            // Si le serveur dit non, on met à jour
            setIsAuthenticated(false);
            setUser(null);
          } else {
            // Mettre à jour avec les données du serveur
            setUser(result.user);
          }
        } else {
          // Pas d'utilisateur en session, vérifier avec le serveur
          const result = await authService.getCurrentUser();
          if (result.success) {
            setIsAuthenticated(true);
            setUser(result.user);
          } else {
            setIsAuthenticated(false);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Erreur de vérification d\'authentification:', error);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user?.role !== 'ADMIN') {
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default ProtectedRoute; 