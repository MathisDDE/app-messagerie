# 🤖 Modération par Intelligence Artificielle avec OpenAI

## Configuration rapide en 3 étapes

### 1️⃣ Créer le fichier .env

Créez un fichier `.env` dans le dossier `/chat-app/server/` avec ce contenu :

```bash
# Base de données (adapter selon votre configuration)
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE_NAME"

# Port du serveur
PORT=5000

# URL du client
CLIENT_URL="http://localhost:3000"

# Clé JWT (générez une clé aléatoire)
JWT_SECRET="votre-cle-secrete-jwt"

# Clés de chiffrement des messages
MESSAGE_SECRET_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
MESSAGE_ALGORITHM="aes-256-cbc"

# 🔑 IMPORTANT : Clé API OpenAI pour la modération IA
OPENAI_API_KEY="sk-proj-VOTRE_CLE_ICI"
```

### 2️⃣ Obtenir votre clé OpenAI

1. Allez sur https://platform.openai.com/signup
2. Créez un compte ou connectez-vous
3. Naviguez vers https://platform.openai.com/api-keys
4. Cliquez sur "Create new secret key"
5. Copiez la clé et collez-la dans votre fichier `.env`

### 3️⃣ Redémarrer le serveur

```bash
cd chat-app/server
npm run dev
```

## 🎯 Ce que fait la modération IA

### Sans clé OpenAI (mode basique) :
- ✅ Détection de patterns simples (phishing, spam, liens suspects)
- ❌ Pas d'analyse contextuelle
- ❌ Pas de détection de contenu inapproprié subtil

### Avec clé OpenAI (mode intelligent) :
- ✅ Analyse contextuelle complète
- ✅ Détection de menaces sophistiquées
- ✅ Compréhension du ton et de l'intention
- ✅ Suggestions personnalisées de sécurité
- ✅ Détection multilingue

## 💸 Coûts estimés

| Messages/jour | Coût approximatif |
|---------------|-------------------|
| 100           | ~0.20$/jour       |
| 1,000         | ~2$/jour          |
| 10,000        | ~20$/jour         |

💡 **Astuce** : OpenAI offre 5$ de crédit gratuit aux nouveaux comptes !

## 🔍 Exemple de détection

### Message suspect :
```
"Félicitations ! Vous avez gagné 1000€ ! 
Cliquez ici : bit.ly/win-money pour réclamer votre prix.
Agissez vite, offre limitée !"
```

### Réponse de l'IA :
```json
{
  "riskScore": 95,
  "riskLevel": "HIGH",
  "isSpam": true,
  "isPhishing": true,
  "hasMaliciousLinks": true,
  "explanation": "Message de spam/phishing classique avec fausse promesse d'argent et lien raccourci suspect",
  "detectedIssues": [
    "Promesse d'argent gratuit (arnaque classique)",
    "Lien raccourci suspect (bit.ly)",
    "Pression temporelle pour agir vite",
    "Langage typique du spam"
  ],
  "suggestions": [
    "Ne cliquez jamais sur ce type de liens",
    "Bloquez cet expéditeur",
    "Signalez ce message comme spam"
  ]
}
```

## 🛡️ Niveaux de sécurité

| Score | Niveau | Action |
|-------|---------|---------|
| 0-20  | SAFE    | ✅ Message envoyé normalement |
| 20-40 | LOW     | ⚠️ Avertissement léger |
| 40-70 | MEDIUM  | ⚠️ Confirmation requise |
| 70-100| HIGH    | ❌ Message bloqué |

## 🔧 Personnalisation

Vous pouvez ajuster la sensibilité dans `services/aiModerationService.js` :

```javascript
// Pour être plus strict
if (score >= 50) return 'HIGH'; // Au lieu de 70

// Pour être plus permissif  
if (score >= 90) return 'HIGH'; // Au lieu de 70
```

## ⚡ Performance

- Temps d'analyse moyen : 500ms-1s par message
- Fallback automatique si l'API est down
- Mise en cache possible pour les messages similaires

## 🐛 Dépannage

### "La modération ne fonctionne pas"
1. Vérifiez que la clé API est dans `.env`
2. Vérifiez les logs du serveur
3. Testez avec le script : `node testModeration.js`

### "Trop de faux positifs"
→ Ajustez les seuils de score dans le code

### "L'API est trop lente"
→ Implémentez un cache Redis pour les messages similaires

## 📞 Support

- Documentation OpenAI : https://platform.openai.com/docs
- Problèmes : Créez une issue sur GitHub
- Questions : Contactez l'équipe de développement 