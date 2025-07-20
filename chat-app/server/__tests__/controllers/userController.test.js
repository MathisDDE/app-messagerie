const request = require('supertest');
const { app } = require('../../index');
const { PrismaClient } = require('../../generated/prisma');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

describe('UserController', () => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'SecurePassword123!'
  };

  beforeEach(async () => {
    // Nettoyer la base de données avant chaque test
    await prisma.user.deleteMany();
  });

  describe('register', () => {
    test('should create new user with valid data', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe(testUser.username);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user).not.toHaveProperty('password');

      // Vérifier que les cookies sont définis
      expect(response.headers['set-cookie']).toBeDefined();
      const cookies = response.headers['set-cookie'];
      expect(cookies.some(c => c.startsWith('authToken='))).toBe(true);
      expect(cookies.some(c => c.startsWith('refreshToken='))).toBe(true);
    });

    test('should handle duplicate email registration', async () => {
      // Créer d'abord un utilisateur
      await prisma.user.create({
        data: {
          ...testUser,
          password: await bcrypt.hash(testUser.password, 10)
        }
      });

      // Tenter de créer un utilisateur avec le même email
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      // La requête devrait soit être rejetée avec un message d'erreur
      // soit retourner un statut false
      expect(response.status).toBe(200);
      if (response.body.status === false) {
        expect(response.body.msg).toContain('Email');
      } else {
        // Si le statut est true, vérifier qu'un nouvel utilisateur n'a pas été créé
        const users = await prisma.user.findMany({
          where: { email: testUser.email }
        });
        expect(users.length).toBe(1);
      }
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      // Créer un utilisateur pour les tests de connexion
      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      await prisma.user.create({
        data: {
          ...testUser,
          password: hashedPassword,
          isAvatarImageSet: false,
          avatarImage: null
        }
      });
    });

    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(true);
      expect(response.body.user).toBeDefined();
      
      // Vérifier les cookies
      expect(response.headers['set-cookie']).toBeDefined();
      const cookies = response.headers['set-cookie'];
      expect(cookies.some(c => c.startsWith('authToken='))).toBe(true);
      expect(cookies.some(c => c.startsWith('refreshToken='))).toBe(true);
    });

    test('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(false);
      expect(response.body.msg).toBe('Incorrect Email or Password.');
    });

    test('should reject banned users', async () => {
      // Bannir l'utilisateur
      await prisma.user.update({
        where: { email: testUser.email },
        data: { 
          isBanned: true,
          bannedReason: 'Test ban'
        }
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe(false);
      expect(response.body.msg).toContain('suspendu');
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
}); 