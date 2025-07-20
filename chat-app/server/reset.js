const { PrismaClient } = require('./generated/prisma'); // ou '@prisma/client' si tu utilises le chemin par défaut
const prisma = new PrismaClient();

async function main() {
  await prisma.message.deleteMany();
  console.log("Tous les messages supprimés !");
}

main().then(() => process.exit());
