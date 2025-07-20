import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaShieldAlt, FaDownload, FaEdit, FaTrash, FaExchangeAlt, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const PrivacySettings = ({ userId }) => {
  const [consents, setConsents] = useState([]);
  const [dataRequests, setDataRequests] = useState([]);
  const [deletionRequest, setDeletionRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('consents');

  const consentTypes = [
    { type: 'TERMS_OF_SERVICE', label: 'Conditions d\'utilisation', required: true },
    { type: 'PRIVACY_POLICY', label: 'Politique de confidentialité', required: true },
    { type: 'MARKETING_EMAILS', label: 'Emails marketing', required: false },
    { type: 'DATA_ANALYTICS', label: 'Analyse des données', required: false },
    { type: 'COOKIES', label: 'Cookies non essentiels', required: false }
  ];

  useEffect(() => {
    fetchUserConsents();
    fetchDataRequests();
  }, [userId]);

  const fetchUserConsents = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_SERVER_URI}/api/gdpr/consent/${userId}`);
      setConsents(response.data.consents);
    } catch (error) {
      console.error('Erreur lors de la récupération des consentements:', error);
    }
  };

  const fetchDataRequests = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_SERVER_URI}/api/gdpr/requests/${userId}`);
      setDataRequests(response.data.dataRequests);
      setDeletionRequest(response.data.deletionRequest);
    } catch (error) {
      console.error('Erreur lors de la récupération des demandes:', error);
    }
  };

  const handleConsentChange = async (consentType, given) => {
    try {
      setLoading(true);
      await axios.post(`${process.env.REACT_APP_SERVER_URI}/api/gdpr/consent/record`, {
        userId,
        consentType,
        given
      });
      toast.success(given ? 'Consentement accordé' : 'Consentement retiré');
      fetchUserConsents();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du consentement');
    } finally {
      setLoading(false);
    }
  };

  const requestDataAccess = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${process.env.REACT_APP_SERVER_URI}/api/gdpr/request/access`, {
        userId
      });
      toast.success(response.data.message);
      fetchDataRequests();
    } catch (error) {
      toast.error('Erreur lors de la demande d\'accès');
    } finally {
      setLoading(false);
    }
  };

  const requestDataPortability = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${process.env.REACT_APP_SERVER_URI}/api/gdpr/request/portability`, {
        userId
      });
      toast.success(response.data.message);
      fetchDataRequests();
    } catch (error) {
      toast.error('Erreur lors de la demande de portabilité');
    } finally {
      setLoading(false);
    }
  };

  const requestDataDeletion = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action sera effective dans 30 jours.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${process.env.REACT_APP_SERVER_URI}/api/gdpr/request/deletion`, {
        userId,
        reason: 'Demande utilisateur'
      });
      toast.success(response.data.message);
      fetchDataRequests();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la demande de suppression');
    } finally {
      setLoading(false);
    }
  };

  const cancelDeletionRequest = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${process.env.REACT_APP_SERVER_URI}/api/gdpr/request/deletion/cancel`, {
        userId
      });
      toast.success(response.data.message);
      fetchDataRequests();
    } catch (error) {
      toast.error('Erreur lors de l\'annulation');
    } finally {
      setLoading(false);
    }
  };

  const getConsentStatus = (consentType) => {
    const consent = consents.find(c => c.consentType === consentType);
    return consent ? consent.given : false;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRequestStatusBadge = (status) => {
    const badges = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex items-center mb-6">
        <FaShieldAlt className="text-3xl text-blue-500 mr-3" />
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Paramètres de confidentialité</h2>
      </div>

      {/* Tabs */}
      <div className="flex mb-6 border-b">
        <button
          onClick={() => setActiveTab('consents')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'consents'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Consentements
        </button>
        <button
          onClick={() => setActiveTab('rights')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'rights'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Mes droits RGPD
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'requests'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Mes demandes
        </button>
      </div>

      {/* Consentements Tab */}
      {activeTab === 'consents' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Gérez vos préférences de confidentialité et vos consentements.
          </p>
          {consentTypes.map((consent) => (
            <div key={consent.type} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-800 dark:text-white">{consent.label}</h4>
                {consent.required && (
                  <span className="text-xs text-red-500">Requis pour utiliser le service</span>
                )}
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={getConsentStatus(consent.type)}
                  onChange={(e) => handleConsentChange(consent.type, e.target.checked)}
                  disabled={loading || consent.required}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      )}

      {/* Droits RGPD Tab */}
      {activeTab === 'rights' && (
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Conformément au RGPD, vous disposez de plusieurs droits concernant vos données personnelles.
            </p>
          </div>

          <div className="grid gap-4">
            <button
              onClick={requestDataAccess}
              disabled={loading}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center">
                <FaDownload className="text-xl text-blue-500 mr-3" />
                <div className="text-left">
                  <h4 className="font-medium text-gray-800 dark:text-white">Droit d'accès</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Obtenir une copie de vos données</p>
                </div>
              </div>
              <span className="text-blue-500">Article 15</span>
            </button>

            <button
              onClick={requestDataPortability}
              disabled={loading}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center">
                <FaExchangeAlt className="text-xl text-green-500 mr-3" />
                <div className="text-left">
                  <h4 className="font-medium text-gray-800 dark:text-white">Droit à la portabilité</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Exporter vos données dans un format réutilisable</p>
                </div>
              </div>
              <span className="text-green-500">Article 20</span>
            </button>

            <button
              onClick={() => toast.info('Contactez le support pour modifier vos données')}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center">
                <FaEdit className="text-xl text-orange-500 mr-3" />
                <div className="text-left">
                  <h4 className="font-medium text-gray-800 dark:text-white">Droit de rectification</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Corriger vos données inexactes</p>
                </div>
              </div>
              <span className="text-orange-500">Article 16</span>
            </button>

            {!deletionRequest || deletionRequest.cancelled ? (
              <button
                onClick={requestDataDeletion}
                disabled={loading}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-red-200 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900 transition-colors"
              >
                <div className="flex items-center">
                  <FaTrash className="text-xl text-red-500 mr-3" />
                  <div className="text-left">
                    <h4 className="font-medium text-gray-800 dark:text-white">Droit à l'effacement</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Supprimer définitivement votre compte</p>
                  </div>
                </div>
                <span className="text-red-500">Article 17</span>
              </button>
            ) : (
              <div className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-red-800 dark:text-red-200">Suppression programmée</h4>
                    <p className="text-sm text-red-600 dark:text-red-300">
                      Votre compte sera supprimé le {formatDate(deletionRequest.scheduledFor)}
                    </p>
                  </div>
                  <button
                    onClick={cancelDeletionRequest}
                    disabled={loading}
                    className="px-4 py-2 bg-white dark:bg-gray-800 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mes demandes Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {dataRequests.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              Aucune demande en cours
            </p>
          ) : (
            dataRequests.map((request) => (
              <div key={request.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-800 dark:text-white">
                    {request.requestType === 'ACCESS' && 'Demande d\'accès aux données'}
                    {request.requestType === 'PORTABILITY' && 'Demande de portabilité'}
                    {request.requestType === 'RECTIFICATION' && 'Demande de rectification'}
                  </h4>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRequestStatusBadge(request.status)}`}>
                    {request.status === 'PENDING' && 'En attente'}
                    {request.status === 'IN_PROGRESS' && 'En cours'}
                    {request.status === 'COMPLETED' && 'Terminée'}
                    {request.status === 'REJECTED' && 'Rejetée'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Demandée le {formatDate(request.requestedAt)}
                </p>
                {request.status === 'COMPLETED' && request.responseUrl && (
                  <a
                    href={`${process.env.REACT_APP_SERVER_URI}${request.responseUrl}`}
                    className="mt-2 inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                    download
                  >
                    <FaDownload className="mr-1" /> Télécharger vos données
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PrivacySettings; 