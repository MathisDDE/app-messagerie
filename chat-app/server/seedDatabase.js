const { PrismaClient } = require('./generated/prisma');
const bcrypt = require('bcrypt');
const multiavatar = require('@multiavatar/multiavatar');

const prisma = new PrismaClient();

async function main() {
  try {
    // Créer un admin
    const adminPassword = await bcrypt.hash("admin123", 10);
    const adminAvatar = Buffer.from(multiavatar('admin')).toString('base64');
    
    const admin = await prisma.user.create({
      data: {
        username: "admin",
        email: "admin@securechat.com",
        password: adminPassword,
        role: "ADMIN",
        isAvatarImageSet: true,
        avatarImage: adminAvatar,
        lastLogin: new Date()
      }
    });
    console.log("✅ Admin créé:", admin.username);

    // Créer quelques utilisateurs de test
    const users = [
      { username: "alice", email: "alice@test.com", password: "alice123" },
      { username: "bob", email: "bob@test.com", password: "bob123" },
      { username: "charlie", email: "charlie@test.com", password: "charlie123" },
      { username: "david", email: "david@test.com", password: "david123" }
    ];

    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const avatar = Buffer.from(multiavatar(userData.username)).toString('base64');
      
      const user = await prisma.user.create({
        data: {
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          role: "USER",
          isAvatarImageSet: true,
          avatarImage: avatar,
          lastLogin: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random login dans les 7 derniers jours
          createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random création dans les 30 derniers jours
        }
      });
      console.log("✅ Utilisateur créé:", user.username);
    }

    // Bannir un utilisateur pour tester
    await prisma.user.update({
      where: { username: "david" },
      data: {
        isBanned: true,
        bannedAt: new Date(),
        bannedReason: "Comportement inapproprié (test)"
      }
    });
    console.log("✅ Utilisateur david banni pour test");

    // Créer quelques logs d'activité
    await prisma.activityLog.createMany({
      data: [
        {
          userId: admin.id,
          action: "LOGIN",
          details: JSON.stringify({ timestamp: new Date() })
        },
        {
          userId: admin.id,
          action: "USER_BANNED",
          details: JSON.stringify({ 
            targetUserId: 5, 
            targetUsername: "david",
            reason: "Comportement inapproprié (test)"
          })
        }
      ]
    });
    console.log("✅ Logs d'activité créés");

    console.log("\n🎉 Base de données initialisée avec succès !");
    console.log("\n📝 Informations de connexion:");
    console.log("Admin: admin@securechat.com / admin123");
    console.log("Users: alice@test.com / alice123, bob@test.com / bob123, etc.");

  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  }); 