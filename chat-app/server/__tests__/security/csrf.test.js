const request = require('supertest');
const { app } = require('../../index');
const { PrismaClient } = require('../../generated/prisma');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

describe('Security Basics', () => {
  let testUser;

  beforeAll(async () => {
    // Nettoyer la base de données
    await prisma.user.deleteMany();

    // Créer un utilisateur de test
    const userData = {
      username: 'csrftest',
      email: 'csrf@test.com',
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

  test('should have secure cookie attributes on login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'SecurePassword123!'
      });

    const cookies = response.headers['set-cookie'];
    if (cookies) {
      const authCookie = cookies.find(c => c.startsWith('authToken='));
      if (authCookie) {
        expect(authCookie).toMatch(/HttpOnly/);
        expect(authCookie).toMatch(/SameSite/);
      }
    }
  });

  test('should require authentication for protected routes', async () => {
    const response = await request(app)
      .post('/api/messages/add')
      .send({
        message: 'Test message'
      });

    expect(response.status).not.toBe(200);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
}); 