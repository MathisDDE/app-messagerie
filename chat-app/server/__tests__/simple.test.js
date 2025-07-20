const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

describe('Test de base', () => {
  test('La connexion à la base de données fonctionne', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as number`;
    expect(result[0].number).toBe(1);
  });
}); 