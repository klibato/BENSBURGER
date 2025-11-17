import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * Composant de protection de routes
 * Redirige vers /login si non authentifié
 * Vérifie les permissions par rôle si requiredRole est spécifié
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Composant à protéger
 * @param {string|string[]} props.requiredRole - Rôle(s) requis (optionnel)
 * @returns {React.ReactElement}
 */
const PrivateRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useAuth();

  // Vérifier l'authentification
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Vérifier les permissions si un rôle est requis
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    // Admin a toujours accès
    if (user.role !== 'admin' && !allowedRoles.includes(user.role)) {
      // Rediriger vers POS si accès refusé
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default PrivateRoute;
