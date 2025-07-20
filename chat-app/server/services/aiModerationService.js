const axios = require('axios');

class AIModerationService {
  constructor() {
    // Configuration de base pour le fallback
    this.suspiciousPatterns = {
      phishing: [
        /click\s+here\s+immediately/gi,
        /verify\s+your\s+account/gi,
        /update\s+(your\s+)?payment/gi,
      ],
      spam: [
        /free\s+money/gi,
        /guaranteed\s+income/gi,
      ],
      maliciousLinks: [
        /bit\.ly|tinyurl|short\.link/gi,
        /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/g,
      ]
    };

    // Mots-clés suspects
    this.suspiciousKeywords = [
      'password', 'credit card', 'social security', 'bank account',
      'paypal', 'bitcoin', 'investment opportunity', 'nigerian prince',
      'inheritance', 'lottery', 'irs', 'tax', 'refund', 'invoice',
      'shipment', 'delivery', 'ups', 'fedex', 'dhl', 'amazon',
      'apple', 'microsoft', 'google', 'facebook', 'instagram',
      'verify', 'confirm', 'update', 'suspended', 'locked',
      'click here', 'act now', 'limited time', 'expires soon',
      'congratulations', 'winner', 'prize', 'reward', 'gift',
      'free', 'guarantee', 'risk-free', 'no obligation',
      'urgent', 'immediate', 'action required', 'important notice'
    ];
  }

  // Analyse avec OpenAI GPT
  async analyzeWithOpenAI(message) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `Tu es un expert en cybersécurité spécialisé dans la détection de messages dangereux.
              
Analyse le message suivant et détermine s'il contient:
- Du spam (publicité non sollicitée, offres trop belles pour être vraies)
- Du phishing (tentatives de vol d'informations personnelles, mots de passe, données bancaires)
- Des liens malveillants (URLs suspectes, raccourcies, IP directes)
- Du contenu inapproprié (harcèlement, menaces, contenu offensant)

Réponds UNIQUEMENT avec un objet JSON valide avec cette structure exacte:
{
  "isSpam": boolean,
  "isPhishing": boolean,
  "hasMaliciousLinks": boolean,
  "isInappropriate": boolean,
  "riskScore": number (0-100),
  "riskLevel": "SAFE" | "LOW" | "MEDIUM" | "HIGH",
  "detectedIssues": ["liste", "des", "problèmes"],
  "suggestions": ["liste", "de", "conseils"],
  "explanation": "Explication courte du risque"
}`
            },
            {
              role: 'user',
              content: message
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      console.log('🤖 Réponse OpenAI brute:', content);
      
      try {
        // Nettoyer la réponse si nécessaire
        const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const analysis = JSON.parse(cleanContent);
        
        // Valider et compléter la structure si nécessaire
        return {
          isSpam: analysis.isSpam || false,
          isPhishing: analysis.isPhishing || false,
          hasMaliciousLinks: analysis.hasMaliciousLinks || false,
          isInappropriate: analysis.isInappropriate || false,
          riskScore: analysis.riskScore || 0,
          riskLevel: analysis.riskLevel || this.getRiskLevel(analysis.riskScore || 0),
          detectedIssues: analysis.detectedIssues || [],
          suggestions: analysis.suggestions || [],
          explanation: analysis.explanation || ''
        };
      } catch (parseError) {
        console.error('Erreur parsing JSON OpenAI:', parseError);
        console.error('Contenu reçu:', content);
        // Fallback vers l'analyse basique
        return this.analyzeMessageBasic(message);
      }
    } catch (error) {
      console.error('Erreur appel API OpenAI:', error.response?.data || error.message);
      // Fallback vers l'analyse basique
      return this.analyzeMessageBasic(message);
    }
  }

  // Analyse basique (fallback)
  analyzeMessageBasic(message) {
    const analysis = {
      isSpam: false,
      isPhishing: false,
      hasMaliciousLinks: false,
      isInappropriate: false,
      riskScore: 0,
      detectedIssues: [],
      suggestions: []
    };

    // Vérification basique des patterns
    for (const pattern of this.suspiciousPatterns.phishing) {
      if (pattern.test(message)) {
        analysis.isPhishing = true;
        analysis.detectedIssues.push('Tentative de phishing possible');
        analysis.riskScore += 50;
        break;
      }
    }

    for (const pattern of this.suspiciousPatterns.spam) {
      if (pattern.test(message)) {
        analysis.isSpam = true;
        analysis.detectedIssues.push('Contenu de spam détecté');
        analysis.riskScore += 30;
        break;
      }
    }

    for (const pattern of this.suspiciousPatterns.maliciousLinks) {
      if (pattern.test(message)) {
        analysis.hasMaliciousLinks = true;
        analysis.detectedIssues.push('Liens suspects détectés');
        analysis.riskScore += 40;
        break;
      }
    }

    analysis.riskLevel = this.getRiskLevel(analysis.riskScore);
    
    return analysis;
  }

  // Analyse principale
  async analyzeWithAI(message, options = {}) {
    console.log('🔍 Analyse du message avec IA...');
    
    // Toujours essayer OpenAI en premier si la clé est disponible
    if (process.env.OPENAI_API_KEY) {
      console.log('🤖 Utilisation de l\'API OpenAI');
      return await this.analyzeWithOpenAI(message);
    }
    
    // Sinon utiliser l'analyse basique
    console.log('⚠️ Pas de clé OpenAI, utilisation de l\'analyse basique');
    return this.analyzeMessageBasic(message);
  }

  // Déterminer le niveau de risque
  getRiskLevel(score) {
    if (score >= 70) return 'HIGH';
    if (score >= 40) return 'MEDIUM';
    if (score >= 20) return 'LOW';
    return 'SAFE';
  }

  // Obtenir des suggestions de sécurité
  getSecurityTips(analysis) {
    const tips = [];

    if (analysis.isPhishing) {
      tips.push('⚠️ Ne partagez jamais vos mots de passe ou informations bancaires');
      tips.push('🔍 Vérifiez toujours l\'expéditeur avant de cliquer sur des liens');
    }

    if (analysis.hasMaliciousLinks) {
      tips.push('🔗 Survolez les liens pour voir leur destination réelle');
      tips.push('🛡️ Utilisez un antivirus à jour');
    }

    if (analysis.isSpam) {
      tips.push('🚫 Signalez ce message comme spam');
      tips.push('📧 Ne répondez pas aux messages de spam');
    }

    if (analysis.isInappropriate) {
      tips.push('🚨 Signalez ce comportement inapproprié');
      tips.push('🔒 Bloquez cet utilisateur si nécessaire');
    }

    // Ajouter les suggestions personnalisées de GPT si disponibles
    if (analysis.suggestions && analysis.suggestions.length > 0) {
      tips.push(...analysis.suggestions);
    }

    return tips;
  }

  // Vérifier un URL spécifique (optionnel)
  async checkURL(url) {
    if (process.env.OPENAI_API_KEY) {
      const analysis = await this.analyzeWithAI(`Vérifier cette URL: ${url}`);
      return {
        isSafe: !analysis.hasMaliciousLinks && analysis.riskScore < 40,
        threats: analysis.detectedIssues
      };
    }

    // Vérification basique
    const suspiciousPatterns = [
      /^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
      /\.(tk|ml|ga|cf)$/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        return {
          isSafe: false,
          threats: ['URL suspect détecté']
        };
      }
    }

    return { isSafe: true, threats: [] };
  }
}

module.exports = new AIModerationService(); 