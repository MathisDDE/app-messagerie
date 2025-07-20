require('dotenv').config({ path: '.env.test' });
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// Augmenter le timeout pour les tests d'intégration
jest.setTimeout(30000);

// Nettoyage après chaque test
afterEach(async () => {
  const tablenames = await prisma.$queryRaw`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname='public'
  `;

  for (const { tablename } of tablenames) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
    } catch (error) {
      console.log(`Error truncating ${tablename}:`, error);
    }
  }
});

// Fermeture des connexions après tous les tests
afterAll(async () => {
  await prisma.$disconnect();

  // Fermer toutes les connexions Socket.IO restantes
  if (global.io) {
    await new Promise((resolve) => {
      global.io.close(() => {
        console.log('Socket.IO connections closed');
        resolve();
      });
    });
  }

  // Nettoyer les variables globales
  global.io = null;
  global.chatSocket = null;
  if (global.onlineUsers) {
    global.onlineUsers.clear();
  }
}); 