// scripts/clearDatabase.js
const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('📋 Récupération de la liste des tables dans le schéma public…');
  // Pour PostgreSQL : on interroge pg_tables
  const tables = await prisma.$queryRaw`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public';
  `;

  if (tables.length === 0) {
    console.log('⚠️  Aucune table trouvée.');
    return;
  }

  // On formate les noms de tables pour la commande TRUNCATE
  const tableList = tables
    .map(row => `"${row.tablename}"`)
    .join(', ');

  console.log(`🧹 Truncate des tables : ${tableList}`);
  // On vide tout, on réinitialise les séquences et on cascade
  await prisma.$executeRawUnsafe(`
    TRUNCATE ${tableList} RESTART IDENTITY CASCADE;
  `);

  console.log('✅ Base de données entièrement purgée.');
}

clearDatabase()
  .catch(err => {
    console.error('❌ Erreur lors du clearDatabase :', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
