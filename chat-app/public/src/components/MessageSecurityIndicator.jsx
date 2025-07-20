import React, { useState } from 'react';
import { IoShield, IoWarning } from 'react-icons/io5';
import { BiShieldX } from 'react-icons/bi';
import { MdSecurity } from 'react-icons/md';

const MessageSecurityIndicator = ({ message, analysis, darkMode }) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!analysis || analysis.riskScore < 20) return null;

  const getIndicatorColor = () => {
    if (analysis.riskScore >= 70) return 'text-red-500';
    if (analysis.riskScore >= 40) return 'text-orange-500';
    return 'text-yellow-500';
  };

  const getIndicatorIcon = () => {
    if (analysis.riskScore >= 70) return <BiShieldX className="text-lg" />;
    if (analysis.riskScore >= 40) return <IoWarning className="text-lg" />;
    return <IoShield className="text-lg" />;
  };

  const getRiskLabel = () => {
    if (analysis.riskScore >= 70) return 'Message dangereux';
    if (analysis.riskScore >= 40) return 'Message suspect';
    return 'Attention requise';
  };

  return (
    <div className="relative">
      {/* Indicateur */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
          darkMode 
            ? 'bg-gray-800 hover:bg-gray-700' 
            : 'bg-gray-100 hover:bg-gray-200'
        } ${getIndicatorColor()}`}
        title="Cliquez pour plus de détails"
      >
        {getIndicatorIcon()}
        <span>Risque: {analysis.riskScore}%</span>
      </button>

      {/* Détails au survol/clic */}
      {showDetails && (
        <div className={`absolute z-40 mt-2 p-3 rounded-lg shadow-xl w-64 ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className={`font-semibold flex items-center gap-2 ${getIndicatorColor()}`}>
              {getIndicatorIcon()}
              {getRiskLabel()}
            </h4>
            <button
              onClick={() => setShowDetails(false)}
              className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} hover:underline`}
            >
              Fermer
            </button>
          </div>

          {/* Types de risques détectés */}
          <div className="space-y-2 text-sm">
            {analysis.detectedIssues && analysis.detectedIssues.length > 0 && (
              <div>
                <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Problèmes détectés:
                </p>
                <ul className="mt-1 space-y-1">
                  {analysis.detectedIssues.map((issue, index) => (
                    <li key={index} className={`ml-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      • {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Badges de risque */}
            <div className="flex flex-wrap gap-1 mt-2">
              {analysis.isSpam && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded text-xs">
                  Spam
                </span>
              )}
              {analysis.isPhishing && (
                <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded text-xs">
                  Phishing
                </span>
              )}
              {analysis.hasMaliciousLinks && (
                <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded text-xs">
                  Liens suspects
                </span>
              )}
            </div>

            {/* Conseils de sécurité */}
            <div className={`mt-3 p-2 rounded ${
              darkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <p className={`text-xs flex items-center gap-1 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <MdSecurity />
                Conseil: Ne cliquez sur aucun lien et ne partagez aucune information personnelle.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageSecurityIndicator; 