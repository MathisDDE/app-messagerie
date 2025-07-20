require('dotenv').config();
const { PrismaClient } = require('./generated/prisma');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Helpers pour le chiffrement
const encrypt = (msg) => {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(process.env.MESSAGE_SECRET_KEY.replace(/"/g, ''), 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(msg), cipher.final()]);
  return {
    iv: iv.toString('hex'),
    content: encrypted.toString('hex'),
  };
};

async function seedGroups() {
  try {
    console.log('🌱 Création des groupes de test...');

    // Récupérer les utilisateurs
    const users = await prisma.user.findMany({
      where: {
        username: {
          in: ['alice', 'bob', 'charlie', 'admin']
        }
      }
    });

    const alice = users.find(u => u.username === 'alice');
    const bob = users.find(u => u.username === 'bob');
    const charlie = users.find(u => u.username === 'charlie');
    const admin = users.find(u => u.username === 'admin');

    if (!alice || !bob || !charlie || !admin) {
      console.log('❌ Utilisateurs non trouvés. Exécutez d\'abord seedDatabase.js');
      return;
    }

    // Groupe 1: Équipe Projet
    const group1 = await prisma.group.create({
      data: {
        name: 'Équipe Projet',
        description: 'Groupe pour la coordination du projet',
        createdBy: alice.id,
        members: {
          create: [
            { userId: alice.id, role: 'ADMIN' },
            { userId: bob.id, role: 'MEMBER' },
            { userId: charlie.id, role: 'MEMBER' }
          ]
        }
      }
    });

    // Messages pour le groupe 1
    const group1Messages = [
      { content: 'Bienvenue dans le groupe Équipe Projet !', senderId: alice.id },
      { content: 'Salut tout le monde !', senderId: bob.id },
      { content: 'Content de faire partie de l\'équipe', senderId: charlie.id },
      { content: 'On commence par quoi ?', senderId: bob.id },
      { content: 'Je propose qu\'on définisse les objectifs', senderId: alice.id }
    ];

    for (const msg of group1Messages) {
      const encrypted = encrypt(msg.content);
      await prisma.groupMessage.create({
        data: {
          content: encrypted.content,
          iv: encrypted.iv,
          groupId: group1.id,
          senderId: msg.senderId
        }
      });
    }

    // Groupe 2: Support Technique
    const group2 = await prisma.group.create({
      data: {
        name: 'Support Technique',
        description: 'Assistance et support pour les utilisateurs',
        createdBy: admin.id,
        members: {
          create: [
            { userId: admin.id, role: 'ADMIN' },
            { userId: alice.id, role: 'MODERATOR' },
            { userId: bob.id, role: 'MEMBER' }
          ]
        }
      }
    });

    // Messages pour le groupe 2
    const group2Messages = [
      { content: 'Groupe de support créé', senderId: admin.id },
      { content: 'Je suis disponible pour aider', senderId: alice.id },
      { content: 'Super initiative !', senderId: bob.id }
    ];

    for (const msg of group2Messages) {
      const encrypted = encrypt(msg.content);
      await prisma.groupMessage.create({
        data: {
          content: encrypted.content,
          iv: encrypted.iv,
          groupId: group2.id,
          senderId: msg.senderId
        }
      });
    }

    console.log('✅ Groupes créés avec succès !');
    console.log('📊 Statistiques :');
    console.log(`   - ${await prisma.group.count()} groupes`);
    console.log(`   - ${await prisma.groupMessage.count()} messages de groupe`);
    console.log(`   - ${await prisma.groupMember.count()} membres au total`);

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Vérifier que MESSAGE_SECRET_KEY est défini
if (!process.env.MESSAGE_SECRET_KEY) {
  console.error('❌ MESSAGE_SECRET_KEY non défini dans .env');
  process.exit(1);
}

seedGroups(); 