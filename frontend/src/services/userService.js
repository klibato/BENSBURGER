import api from './api';

/**
 * Service pour gérer les utilisateurs via l'API
 */

/**
 * Récupérer tous les utilisateurs
 * @param {Object} filters - Filtres optionnels { include_inactive }
 * @returns {Promise<Array>} Liste des utilisateurs
 */
export const getAllUsers = async (filters = {}) => {
  try {
    const params = new URLSearchParams();

    if (filters.include_inactive !== undefined) {
      params.append('include_inactive', filters.include_inactive);
    }

    const response = await api.get(`/users?${params.toString()}`);
    return response.data.data;
  } catch (error) {
    console.error('Erreur lors du chargement des utilisateurs:', error);
    throw error;
  }
};

/**
 * Récupérer un utilisateur par ID
 * @param {number} id - ID de l'utilisateur
 * @returns {Promise<Object>} Utilisateur
 */
export const getUserById = async (id) => {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data.data;
  } catch (error) {
    console.error(`Erreur lors du chargement de l'utilisateur ${id}:`, error);
    throw error;
  }
};

/**
 * Créer un nouvel utilisateur
 * @param {Object} userData - Données de l'utilisateur
 * @returns {Promise<Object>} Utilisateur créé
 */
export const createUser = async (userData) => {
  const response = await api.post('/users', userData);
  return response.data;
};

/**
 * Modifier un utilisateur
 * @param {number} id - ID de l'utilisateur
 * @param {Object} userData - Données de l'utilisateur
 * @returns {Promise<Object>} Utilisateur modifié
 */
export const updateUser = async (id, userData) => {
  const response = await api.put(`/users/${id}`, userData);
  return response.data;
};

/**
 * Supprimer un utilisateur (désactivation)
 * @param {number} id - ID de l'utilisateur
 * @returns {Promise<Object>} Confirmation
 */
export const deleteUser = async (id) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};
