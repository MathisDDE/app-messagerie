import React from 'react';
import { IoWarning, IoShield, IoClose } from 'react-icons/io5';
import { BiShieldX } from 'react-icons/bi';
import { MdSecurity } from 'react-icons/md';

const SecurityWarning = ({ analysis, onClose, onProceed, onCancel, darkMode }) => {
  if (!analysis) return null;

  const getRiskColor = (riskScore) => {
    if (riskScore >= 70) return 'red';
    if (riskScore >= 40) return 'orange';
    return 'yellow';
  };

  const getRiskIcon = (riskScore) => {
    if (riskScore >= 70) return <BiShieldX className="text-4xl" />;
    if (riskScore >= 40) return <IoWarning className="text-4xl" />;
    return <IoShield className="text-4xl" />;
  };

  const getRiskLevel = (riskScore) => {
    if (riskScore >= 70) return 'Risque élevé';
    if (riskScore >= 40) return 'Risque moyen';
    if (riskScore >= 20) return 'Risque faible';
    return 'Sûr';
  };

  const color = getRiskColor(analysis.riskScore);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className={`max-w-md w-full mx-4 rounded-lg shadow-2xl ${
        darkMode ? 'bg-gray-800' : 'bg-white'
      }`}>
        {/* Header */}
        <div className={`p-4 rounded-t-lg bg-${color}-600`}>
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              {getRiskIcon(analysis.riskScore)}
              <div>
                <h3 className="text-xl font-bold">Avertissement de sécurité</h3>
                <p className="text-sm opacity-90">{getRiskLevel(analysis.riskScore)}</p>
              </div>
            </div>
            {onClose && (
              <button 
                onClick={onClose}
                className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
              >
                <IoClose className="text-2xl" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Score de risque */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Score de risque:
              </span>
              <span className={`font-bold text-${color}-600`}>
                {analysis.riskScore}/100
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className={`h-3 rounded-full bg-${color}-500 transition-all duration-300`}
                style={{ width: `${analysis.riskScore}%` }}
              />
            </div>
          </div>

          {/* Problèmes détectés */}
          {analysis.detectedIssues && analysis.detectedIssues.length > 0 && (
            <div className="mb-4">
              <h4 className={`font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Problèmes détectés:
              </h4>
              <ul className="space-y-1">
                {analysis.detectedIssues.map((issue, index) => (
                  <li 
                    key={index}
                    className={`flex items-center gap-2 text-sm ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    <span className={`text-${color}-500`}>•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Types de risques */}
          <div className="mb-4 flex flex-wrap gap-2">
            {analysis.isSpam && (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full text-sm">
                Spam
              </span>
            )}
            {analysis.isPhishing && (
              <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full text-sm">
                Phishing
              </span>
            )}
            {analysis.hasMaliciousLinks && (
              <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full text-sm">
                Liens malveillants
              </span>
            )}
            {analysis.isInappropriate && (
              <span className="px-3 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-full text-sm">
                Contenu inapproprié
              </span>
            )}
          </div>

          {/* Suggestions */}
          {analysis.suggestions && analysis.suggestions.length > 0 && (
            <div className="mb-4">
              <h4 className={`font-semibold mb-2 flex items-center gap-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <MdSecurity className="text-xl" />
                Recommandations:
              </h4>
              <ul className="space-y-1">
                {analysis.suggestions.map((suggestion, index) => (
                  <li 
                    key={index}
                    className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Actions */}
        {(onProceed || onCancel) && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition"
              >
                Annuler
              </button>
            )}
            {onProceed && analysis.riskScore < 70 && (
              <button
                onClick={onProceed}
                className={`px-4 py-2 rounded-lg font-medium text-white bg-${color}-600 hover:bg-${color}-700 transition`}
              >
                Envoyer quand même
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityWarning; 