import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaCookie, FaTimes } from 'react-icons/fa';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    marketing: false,
    preferences: false
  });

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà donné son consentement
    const consentGiven = localStorage.getItem('cookieConsentGiven');
    if (!consentGiven) {
      setShowBanner(true);
    }
  }, []);

  const generateSessionId = () => {
    return 'session_' + Math.random().toString(36).substr(2, 9);
  };

  const saveConsent = async (accepted) => {
    const sessionId = localStorage.getItem('sessionId') || generateSessionId();
    localStorage.setItem('sessionId', sessionId);
    
    try {
      await axios.post(`${process.env.REACT_APP_SERVER_URI}/api/gdpr/consent/cookies`, {
        sessionId,
        essential: true,
        analytics: accepted ? preferences.analytics : false,
        marketing: accepted ? preferences.marketing : false,
        preferences: accepted ? preferences.preferences : false
      });

      localStorage.setItem('cookieConsentGiven', 'true');
      localStorage.setItem('cookiePreferences', JSON.stringify(preferences));
      setShowBanner(false);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du consentement:', error);
    }
  };

  const acceptAll = () => {
    setPreferences({
      essential: true,
      analytics: true,
      marketing: true,
      preferences: true
    });
    saveConsent(true);
  };

  const acceptSelected = () => {
    saveConsent(true);
  };

  const rejectAll = () => {
    setPreferences({
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false
    });
    saveConsent(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 shadow-2xl border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <FaCookie className="text-3xl text-yellow-500 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nous utilisons des cookies
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Nous utilisons des cookies pour améliorer votre expérience sur notre site. 
                Les cookies essentiels sont nécessaires au fonctionnement du site. 
                Vous pouvez choisir d'accepter ou de refuser les autres types de cookies.
              </p>

              {!showDetails ? (
                <button
                  onClick={() => setShowDetails(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Personnaliser les cookies
                </button>
              ) : (
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Cookies essentiels</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Nécessaires au fonctionnement du site
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.essential}
                      disabled
                      className="h-4 w-4 text-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Cookies analytiques</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Nous aident à comprendre comment vous utilisez le site
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences({...preferences, analytics: e.target.checked})}
                      className="h-4 w-4 text-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Cookies marketing</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Utilisés pour vous proposer des publicités pertinentes
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences({...preferences, marketing: e.target.checked})}
                      className="h-4 w-4 text-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">Cookies de préférences</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Mémorisent vos préférences (langue, thème, etc.)
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={preferences.preferences}
                      onChange={(e) => setPreferences({...preferences, preferences: e.target.checked})}
                      className="h-4 w-4 text-blue-600"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={acceptAll}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Accepter tout
                </button>
                {showDetails && (
                  <button
                    onClick={acceptSelected}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Accepter la sélection
                  </button>
                )}
                <button
                  onClick={rejectAll}
                  className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Refuser tout
                </button>
                <a
                  href="/privacy-policy"
                  className="px-4 py-2 text-blue-600 hover:text-blue-800 underline"
                >
                  Politique de confidentialité
                </a>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="ml-4 text-gray-400 hover:text-gray-600"
          >
            <FaTimes />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent; 