# Guide du Système de Modération par IA

## Vue d'ensemble

Le système de modération par IA analyse automatiquement tous les messages envoyés pour détecter :
- **Spam** : Messages promotionnels non sollicités
- **Phishing** : Tentatives d'hameçonnage
- **Liens malveillants** : URLs suspects ou dangereux
- **Contenu inapproprié** : Messages offensants ou toxiques

## Fonctionnalités

### 1. Analyse en temps réel
- Chaque message est analysé avant l'envoi
- Score de risque de 0 à 100
- Détection automatique des menaces

### 2. Niveaux de risque

| Score | Niveau | Action |
|-------|--------|--------|
| 0-19 | Sûr | Message envoyé normalement |
| 20-39 | Faible | Indicateur de sécurité affiché |
| 40-69 | Moyen | Avertissement + confirmation requise |
| 70-100 | Élevé | Message bloqué automatiquement |

### 3. Types de détection

#### Phishing
- Demandes de mots de passe
- Liens vers de faux sites
- Urgences artificielles
- Promesses de gains

#### Spam
- Offres commerciales
- Publicités déguisées
- Messages en masse
- Promotions non sollicitées

#### Liens malveillants
- URLs raccourcies suspectes
- Domaines non fiables
- Fichiers exécutables
- Adresses IP directes

## Configuration

### Variables d'environnement (optionnelles)

```env
# API OpenAI (recommandé pour une meilleure précision)
OPENAI_API_KEY=sk-...

# Google Perspective API (gratuit, détection de toxicité)
PERSPECTIVE_API_KEY=AIza...

# Google Safe Browsing (vérification d'URLs)
GOOGLE_SAFE_BROWSING_KEY=AIza...
```

### Sans API externes
Le système fonctionne avec une détection basique basée sur des patterns même sans API externes.

## Interface utilisateur

### Pour l'expéditeur
1. **Message sûr** : Envoi normal
2. **Message suspect** : Popup d'avertissement avec :
   - Score de risque
   - Problèmes détectés
   - Conseils de sécurité
   - Options : Envoyer quand même / Annuler

### Pour le destinataire
- **Indicateur de sécurité** sur les messages suspects
- Clic pour voir les détails
- Conseils de protection

## API Endpoints

### Analyser un message
```http
POST /api/moderation/analyze
{
  "message": "Texte à analyser"
}
```

### Vérifier une URL
```http
POST /api/moderation/check-url
{
  "url": "https://example.com"
}
```

### Signaler un message
```http
POST /api/moderation/report
{
  "messageId": 123,
  "reportType": "PHISHING",
  "reportReason": "Demande de mot de passe suspect",
  "userId": 456
}
```

### Statistiques utilisateur
```http
GET /api/moderation/stats/{userId}
```

## Personnalisation

### Ajuster la sensibilité
Dans `aiModerationService.js`, modifiez les seuils :
```javascript
// Seuils actuels
const BLOCK_THRESHOLD = 70;  // Bloquer si >= 70
const WARN_THRESHOLD = 40;   // Avertir si >= 40
```

### Ajouter des patterns
Ajoutez vos propres patterns de détection :
```javascript
phishing: [
  /votre-pattern-ici/gi,
  // ...
]
```

### Mots-clés personnalisés
```javascript
this.suspiciousKeywords = [
  'mot-clé-1',
  'mot-clé-2',
  // ...
];
```

## Bonnes pratiques

1. **Ne pas désactiver** les avertissements sans raison valable
2. **Signaler** les faux positifs pour améliorer le système
3. **Éduquer** les utilisateurs sur les risques
4. **Vérifier** régulièrement les logs de modération
5. **Mettre à jour** les patterns selon les nouvelles menaces

## Exemples de messages bloqués

- ❌ "Cliquez ici immédiatement pour vérifier votre compte"
- ❌ "Félicitations ! Vous avez gagné 1000€"
- ❌ "Envoyez votre mot de passe pour débloquer"
- ❌ "bit.ly/xyz123" (liens raccourcis suspects)

## Support

Pour toute question ou amélioration :
- Consultez les logs dans `ModerationLog`
- Vérifiez les rapports dans `MessageReport`
- Ajustez les patterns selon vos besoins 