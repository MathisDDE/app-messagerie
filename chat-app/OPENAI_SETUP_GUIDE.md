# 🤖 Guide de configuration OpenAI pour la modération par IA

## 🚀 Configuration rapide

### 1. Obtenir une clé API OpenAI

1. Créez un compte sur [OpenAI Platform](https://platform.openai.com/signup)
2. Allez dans [API Keys](https://platform.openai.com/api-keys)
3. Cliquez sur "Create new secret key"
4. Copiez la clé (elle commence par `sk-`)

### 2. Configurer la clé dans votre projet

Dans le fichier `/chat-app/server/.env`, ajoutez :

```env
OPENAI_API_KEY="sk-proj-votre-clé-ici"
```

### 3. Redémarrer le serveur

```bash
cd chat-app/server
npm run dev
```

## 💰 Tarification

- **Modèle utilisé** : GPT-3.5-turbo
- **Coût approximatif** : ~0.002$ par analyse de message
- **Exemple** : 10,000 messages analysés = ~20$
- **Crédit gratuit** : OpenAI offre 5$ de crédit gratuit aux nouveaux comptes

## 🎯 Fonctionnalités avec OpenAI

Avec l'API OpenAI configurée, le système peut détecter intelligemment :

### 1. **Spam avancé**
- Publicités déguisées
- Offres trop belles pour être vraies
- Messages promotionnels subtils
- Chaînes de messages

### 2. **Phishing sophistiqué**
- Usurpation d'identité
- Demandes d'informations personnelles déguisées
- Faux messages d'urgence
- Imitations de services connus

### 3. **Liens malveillants**
- URLs raccourcies suspectes
- Redirections cachées
- Sites de phishing
- Téléchargements dangereux

### 4. **Contenu inapproprié**
- Harcèlement
- Menaces voilées
- Discours haineux
- Contenu offensant

### 5. **Analyse contextuelle**
- Comprend le contexte du message
- Détecte les tentatives subtiles
- Analyse le ton et l'intention
- Suggère des actions appropriées

## 📊 Exemple de réponse GPT

```json
{
  "isSpam": false,
  "isPhishing": true,
  "hasMaliciousLinks": true,
  "isInappropriate": false,
  "riskScore": 85,
  "riskLevel": "HIGH",
  "detectedIssues": [
    "Tentative de phishing détectée",
    "URL raccourcie suspecte",
    "Demande d'informations personnelles"
  ],
  "suggestions": [
    "Ne cliquez pas sur le lien",
    "Ne partagez aucune information personnelle",
    "Signalez ce message comme phishing"
  ],
  "explanation": "Ce message semble être une tentative de phishing utilisant l'urgence pour vous faire cliquer sur un lien suspect."
}
```

## 🔧 Configuration avancée

### Ajuster la sensibilité

Dans `aiModerationService.js`, vous pouvez modifier le prompt système :

```javascript
role: 'system',
content: `Tu es un expert en cybersécurité...
// Ajoutez vos critères spécifiques ici
`
```

### Utiliser GPT-4 (plus précis mais plus cher)

```javascript
model: 'gpt-4-turbo-preview', // Au lieu de 'gpt-3.5-turbo'
```

## 🛡️ Sans clé OpenAI

Si vous n'avez pas de clé OpenAI, le système utilise automatiquement l'analyse basique avec des patterns prédéfinis. C'est moins intelligent mais toujours fonctionnel.

## 📈 Monitoring

Pour suivre votre utilisation :
1. Connectez-vous à [OpenAI Platform](https://platform.openai.com)
2. Allez dans "Usage"
3. Surveillez vos coûts et définissez des limites si nécessaire

## ⚠️ Sécurité

- Ne partagez JAMAIS votre clé API
- Ne la commitez pas dans Git
- Utilisez des variables d'environnement
- Définissez des limites de dépenses sur OpenAI

## 🆘 Dépannage

### "Invalid API key"
→ Vérifiez que la clé est correctement copiée dans `.env`

### "Rate limit exceeded"
→ Attendez quelques secondes ou upgradez votre plan OpenAI

### "Insufficient credits"
→ Ajoutez des crédits sur votre compte OpenAI

## 💡 Astuce

Pour tester sans utiliser de crédits, créez un mode test dans votre code :

```javascript
if (process.env.NODE_ENV === 'test') {
  // Retourner une analyse factice
  return { riskScore: 0, riskLevel: 'SAFE', ... };
}
``` 