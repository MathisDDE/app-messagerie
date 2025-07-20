const request = require('supertest');
const { app } = require('../../index');
const { PrismaClient } = require('../../generated/prisma');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

describe('XSS Protection', () => {
  let testUser;

  beforeAll(async () => {
    // Nettoyer la base de données
    await prisma.user.deleteMany();

    // Créer un utilisateur de test
    const userData = {
      username: 'securitytest',
      email: 'security@test.com',
      password: 'SecurePassword123!',
      isAvatarImageSet: false,
      avatarImage: null
    };

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Créer l'utilisateur
    testUser = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword
      }
    });
  });

  describe('Input Sanitization', () => {
    test('should handle malicious input appropriately', async () => {
      const maliciousData = {
        username: '<script>alert("xss")</script>',
        email: 'test@test.com" onerror="alert(1)',
      };

      // Tenter d'envoyer des données malveillantes via l'API
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: maliciousData.username,
          email: maliciousData.email,
          password: 'SecurePassword123!'
        });

      // La requête devrait soit être rejetée soit acceptée avec sanitization
      if (response.status === 200 && response.body.status === true) {
        // Si l'utilisateur est créé, vérifier que le contenu est sécurisé
        const newUser = await prisma.user.findUnique({
          where: { email: maliciousData.email }
        });
        
        if (newUser) {
          // Vérifier que le contenu n'est pas exactement le même que l'entrée malveillante
          // OU qu'il a été encodé/échappé d'une manière ou d'une autre
          const isSafe = 
            newUser.username !== maliciousData.username ||  // Soit différent
            newUser.username.includes('&lt;') ||           // Soit encodé en HTML
            newUser.username.includes('\\u003c');          // Soit encodé en Unicode

          expect(isSafe).toBe(true);
        }
      }
      // Si la requête est rejetée, c'est aussi une réponse valide
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
}); 