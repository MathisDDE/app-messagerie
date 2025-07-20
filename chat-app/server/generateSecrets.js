const crypto = require('crypto');

console.log('=== Clés secrètes générées pour votre fichier .env ===\n');

// Générer JWT_SECRET
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log(`JWT_SECRET=${jwtSecret}`);

// Générer JWT_REFRESH_SECRET
const jwtRefreshSecret = crypto.randomBytes(64).toString('hex');
console.log(`JWT_REFRESH_SECRET=${jwtRefreshSecret}`);

// Générer MESSAGE_SECRET_KEY (32 caractères pour AES-256)
const messageSecretKey = crypto.randomBytes(32).toString('hex');
console.log(`MESSAGE_SECRET_KEY=${messageSecretKey}`);

console.log('\n=== Fichier .env complet ===\n');

console.log(`# Port du serveur
PORT=5000

# Base de données PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/codex

# Secrets JWT (clés générées automatiquement)
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${jwtRefreshSecret}

# Environnement
NODE_ENV=development

# URL du client
CLIENT_URL=http://localhost:3000

# Chiffrement des messages
MESSAGE_ALGORITHM=aes-256-ctr
MESSAGE_SECRET_KEY=${messageSecretKey}

# OpenAI API (optionnel pour la modération AI)
# OPENAI_API_KEY=your-openai-api-key
`);

console.log('\n=== Instructions ===');
console.log('1. Copiez le contenu ci-dessus dans votre fichier .env');
console.log('2. Remplacez DATABASE_URL par votre URL de base de données');
console.log('3. NE PARTAGEZ JAMAIS ces clés secrètes !');
console.log('4. Générez de nouvelles clés pour la production'); 