import api from './api';

/**
 * Récupérer les logs avec filtres et pagination
 */
export const getLogs = async (params = {}) => {
  const response = await api.get('/logs', { params });
  return response.data;
};

/**
 * Récupérer les statistiques des logs
 */
export const getLogsStats = async (params = {}) => {
  const response = await api.get('/logs/stats', { params });
  return response.data;
};

/**
 * Exporter les logs en CSV
 */
export const exportLogsCSV = async (params = {}) => {
  const response = await api.get('/logs/export', {
    params,
    responseType: 'blob', // Important pour télécharger le fichier
  });

  // Créer un lien de téléchargement
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `logs_audit_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();

  return response;
};
