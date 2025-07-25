# 🚀 Fonctionnalités Avancées de Chat

Ce document décrit les nouvelles fonctionnalités avancées ajoutées à l'application de messagerie.

## 📋 Table des matières

1. [Partage de fichiers](#partage-de-fichiers)
2. [Réactions aux messages](#réactions-aux-messages)
3. [Répondre à un message](#répondre-à-un-message)
4. [Modifier/Supprimer un message](#modifiersupprimer-un-message)
5. [Messages éphémères](#messages-éphémères)

## 📁 Partage de fichiers

### Description
Les utilisateurs peuvent partager des fichiers (images, documents, etc.) dans leurs conversations.

### Comment utiliser
1. Cliquez sur l'icône 📎 dans la zone de saisie
2. Sélectionnez un fichier (max 50MB)
3. Le fichier sera automatiquement envoyé

### Types de fichiers supportés
- Images : JPG, PNG, GIF, WebP
- Documents : PDF, DOC, DOCX, TXT
- Vidéos : MP4, AVI, MOV
- Audio : MP3, WAV

### API Endpoint
```
POST /api/messages/upload
Content-Type: multipart/form-data
Body: { file, from, to }
```

## 👍 Réactions aux messages

### Description
Ajoutez des réactions emoji aux messages pour exprimer vos émotions rapidement.

### Comment utiliser
1. Survolez un message
2. Cliquez sur l'icône 😊
3. Choisissez un emoji parmi : 👍 ❤️ 😂 😮 😢 😡
4. Cliquez sur la même réaction pour la retirer

### API Endpoints
```
POST /api/messages/reaction
Body: { messageId, emoji, userId }

GET /api/messages/reactions/:messageId
Response: [{ emoji, count, users }]
```

## ↩️ Répondre à un message

### Description
Répondez directement à un message spécifique pour maintenir le contexte de la conversation.

### Comment utiliser
1. Survolez le message auquel vous voulez répondre
2. Cliquez sur l'icône ↩️
3. Le message original s'affiche au-dessus de la zone de saisie
4. Tapez votre réponse et envoyez

### API Endpoint
```
POST /api/messages/reply
Body: { from, to, message, replyToId }
```

## ✏️ Modifier/Supprimer un message

### Modifier un message
- **Délai** : 5 minutes maximum après l'envoi
- **Comment** : Cliquez sur l'icône ✏️ sur vos propres messages
- **Indicateur** : "(modifié)" apparaît à côté de l'heure

### Supprimer un message
- **Comment** : Cliquez sur l'icône 🗑️ sur vos propres messages
- **Confirmation** : Une boîte de dialogue demande confirmation
- **Résultat** : Le message est supprimé pour tous les utilisateurs

### API Endpoints
```
POST /api/messages/edit
Body: { messageId, newContent, userId }

POST /api/messages/delete
Body: { messageId, userId }
```

## ⏰ Messages éphémères

### Description
Envoyez des messages qui disparaissent automatiquement après un temps défini.

### Comment utiliser
1. Cliquez sur l'icône ⏰ dans la zone de saisie
2. Sélectionnez la durée (1min, 5min, 10min, 30min, 1h)
3. Tapez votre message
4. Le message disparaîtra automatiquement après le délai

### API Endpoint
```
POST /api/messages/ephemeral
Body: { from, to, message, expiresInMinutes }
```

## 🔄 Événements Socket.io

Tous les événements sont diffusés en temps réel :

```javascript
// Réactions
socket.emit("reaction-add", { messageId, emoji, userId, to })
socket.on("reaction-update", { messageId, emoji, userId, action })

// Modifications
socket.emit("message-edit", { messageId, newContent, to, from })
socket.on("message-edited", { messageId, newContent, from })

// Suppressions
socket.emit("message-delete", { messageId, to, from })
socket.on("message-deleted", { messageId, from })

// Fichiers
socket.emit("file-uploaded", { to, from, message })
socket.on("file-received", { message, from })
```

## 🛡️ Sécurité

- **Chiffrement** : Tous les messages texte sont chiffrés
- **Validation** : Vérification des permissions pour modifier/supprimer
- **Limites** : Taille de fichier limitée à 50MB
- **Authentification** : Seuls les utilisateurs authentifiés peuvent accéder aux fonctionnalités

## 📱 Interface utilisateur

### MessageItem Component
Le nouveau composant `MessageItem` gère l'affichage de chaque message avec :
- Actions au survol (réaction, réponse, édition, suppression)
- Affichage des réactions
- Indicateurs visuels (modifié, éphémère)
- Prévisualisation des fichiers

### ChatInput Component
Amélioré avec :
- Sélecteur de fichiers
- Mode message éphémère
- Prévisualisation de la réponse
- Indicateurs visuels

## 🚀 Installation

1. Installer les dépendances :
```bash
# Backend
cd server
npm install multer express-fileupload

# Frontend
cd ../public
npm install
```

2. Exécuter les migrations Prisma :
```bash
cd server
npx prisma migrate dev
```

3. Créer le dossier uploads :
```bash
mkdir server/uploads
```

4. Démarrer l'application :
```bash
# Backend
cd server
npm start

# Frontend
cd ../public
npm start
```

## 🎯 Prochaines étapes

- [ ] Notifications push pour les nouveaux messages
- [ ] Appels vidéo/audio
- [ ] Statuts personnalisés
- [ ] Groupes de discussion
- [ ] Recherche dans les messages

---

Développé avec ❤️ pour améliorer l'expérience de messagerie instantanée.
