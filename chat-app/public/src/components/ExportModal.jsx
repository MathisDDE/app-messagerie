import React, { useState } from 'react';
import axios from 'axios';
import { exportJsonRoute, exportTxtRoute, exportAllRoute } from '../utils/APIRoutes';
import { toast } from 'react-toastify';

const ExportModal = ({ isOpen, onClose, darkMode, currentUser, currentChat }) => {
  const [exportFormat, setExportFormat] = useState('json');
  const [exportScope, setExportScope] = useState('current');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      let url;
      let params = {};

      if (exportScope === 'current' && currentChat) {
        // Export conversation actuelle
        url = exportFormat === 'json' 
          ? `${exportJsonRoute}/${currentUser.id}`
          : `${exportTxtRoute}/${currentUser.id}`;
        
        params.contactId = currentChat.id;
        
        if (dateRange.startDate) params.startDate = dateRange.startDate;
        if (dateRange.endDate) params.endDate = dateRange.endDate;
      } else {
        // Export toutes les conversations
        url = `${exportAllRoute}/${currentUser.id}`;
      }

      const response = await axios.get(url, {
        params,
        responseType: 'blob'
      });

      // Créer un lien de téléchargement
      const blob = new Blob([response.data], {
        type: exportFormat === 'json' ? 'application/json' : 'text/plain'
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      const filename = exportScope === 'current' 
        ? `conversation-${currentChat?.username}-${Date.now()}.${exportFormat}`
        : `all-conversations-${Date.now()}.json`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Export réussi !');
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Erreur lors de l\'export');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg p-6 w-full max-w-md`}>
        <h2 className="text-xl font-bold mb-4">Exporter les conversations</h2>

        {/* Scope d'export */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Que voulez-vous exporter ?</label>
          <div className="space-y-2">
            {currentChat && (
              <label className="flex items-center">
                <input
                  type="radio"
                  value="current"
                  checked={exportScope === 'current'}
                  onChange={(e) => setExportScope(e.target.value)}
                  className="mr-2"
                />
                <span>Conversation actuelle avec {currentChat.username}</span>
              </label>
            )}
            <label className="flex items-center">
              <input
                type="radio"
                value="all"
                checked={exportScope === 'all'}
                onChange={(e) => setExportScope(e.target.value)}
                className="mr-2"
              />
              <span>Toutes les conversations</span>
            </label>
          </div>
        </div>

        {/* Format d'export (seulement pour conversation unique) */}
        {exportScope === 'current' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Format d'export</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-300'
              }`}
            >
              <option value="json">JSON (avec métadonnées)</option>
              <option value="txt">TXT (format simple)</option>
            </select>
          </div>
        )}

        {/* Filtre de date (seulement pour conversation unique) */}
        {exportScope === 'current' && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Période (optionnel)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                className={`px-3 py-2 border rounded-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-300'
                }`}
                placeholder="Date début"
              />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                className={`px-3 py-2 border rounded-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-300'
                }`}
                placeholder="Date fin"
              />
            </div>
          </div>
        )}

        {/* Note sur la confidentialité */}
        <div className={`text-sm p-3 rounded-lg mb-4 ${
          darkMode ? 'bg-gray-700' : 'bg-blue-50'
        }`}>
          <p className="flex items-start gap-2">
            <span>🔒</span>
            <span>Les messages sont déchiffrés pour l'export. Gardez vos exports en sécurité.</span>
          </p>
        </div>

        {/* Boutons */}
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={loading}
            className={`flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg transition ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Export en cours...' : 'Exporter'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-700 py-2 rounded-lg transition"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal; 