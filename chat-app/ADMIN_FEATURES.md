# Fonctionnalités Administration - SecureChat

## 🔒 Accès Admin

### Connexion
- Email: `admin@securechat.com`
- Mot de passe: `admin123`

### Utilisateurs de test
- `alice@test.com` / `alice123`
- `bob@test.com` / `bob123`
- `charlie@test.com` / `charlie123`
- `david@test.com` / `david123` (banni)

## 📊 Dashboard Admin

### Navigation
L'interface admin est accessible via `/admin` et comprend 3 sections :

### 1. Tableau de bord
- **Statistiques en temps réel** :
  - Nombre total d'utilisateurs
  - Utilisateurs actifs (dernières 24h)
  - Messages totaux et messages du jour
  - Utilisateurs bannis
  - Nouveaux inscrits de la semaine

### 2. Gestion des utilisateurs
- **Liste complète** avec :
  - Avatar et informations de base
  - Rôle (USER/ADMIN)
  - Nombre de messages
  - Statut (Actif/Banni)
  - Dernière connexion
- **Recherche** par nom ou email
- **Actions disponibles** :
  - Bannir un utilisateur (avec raison obligatoire)
  - Débannir un utilisateur
  - Les admins ne peuvent pas être bannis

### 3. Journal d'activité
- **Logs automatiques** pour :
  - Connexions/Déconnexions
  - Bannissements/Débannissements
  - Actions administratives
- **Affichage** avec :
  - Type d'action avec icône
  - Utilisateur concerné
  - Date et heure
  - Détails supplémentaires

## 🔧 Architecture technique

### Base de données
Nouveaux champs ajoutés au modèle User :
- `isBanned` (Boolean)
- `bannedAt` (DateTime?)
- `bannedReason` (String?)
- `lastLogin` (DateTime?)
- `createdAt` (DateTime)

Nouveau modèle ActivityLog :
- `userId` (référence User)
- `action` (String)
- `details` (JSON)
- `createdAt` (DateTime)

### Routes API
- `GET /api/admin/stats/:userId` - Statistiques dashboard
- `GET /api/admin/users/:userId` - Liste des utilisateurs
- `PUT /api/admin/ban/:adminId/:userId` - Bannir/débannir
- `GET /api/admin/logs/:userId` - Journal d'activité

### Sécurité
- Vérification du rôle ADMIN sur toutes les routes
- Traçabilité complète des actions
- Protection contre le bannissement d'admins

## 🚀 Test rapide

1. Connectez-vous avec le compte admin
2. Accédez à `/admin`
3. Testez :
   - Visualisation des statistiques
   - Recherche d'utilisateurs
   - Bannissement de "charlie" (par exemple)
   - Débannissement de "david"
   - Consultation du journal d'activité

## 📝 Notes
- L'utilisateur "david" est pré-banni pour les tests
- Les statistiques sont calculées en temps réel
- Les logs d'activité sont créés automatiquement
- L'interface supporte le mode sombre 