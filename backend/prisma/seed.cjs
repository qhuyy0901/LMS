require('dotenv').config();
const { PrismaMssql } = require('@prisma/adapter-mssql');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const parseSqlServerConnection = (url) => {
  const cleanUrl = url.replace(/^sqlserver:\/\//i, '');
  const [serverPart, ...rawOptions] = cleanUrl.split(';').filter(Boolean);
  const [server, port] = serverPart.split(':');
  const options = rawOptions.reduce((acc, item) => {
    const separatorIndex = item.indexOf('=');
    if (separatorIndex === -1) return acc;
    const key = item.slice(0, separatorIndex).trim().toLowerCase();
    const value = item.slice(separatorIndex + 1).trim().replace(/^\{|\}$/g, '');
    acc[key] = value;
    return acc;
  }, {});

  return {
    server,
    port: port ? Number(port) : 1433,
    database: options.database || options['initial catalog'],
    user: options.user || options.username || options.uid,
    password: options.password || options.pwd,
    options: {
      encrypt: options.encrypt !== 'false',
      trustServerCertificate: options.trustservercertificate === 'true',
    },
  };
};

const adapter = new PrismaMssql(parseSqlServerConnection(process.env.DATABASE_URL));
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding users...');

  // Hash password
  const saltRounds = 10;
  const adminPassword = await bcrypt.hash('123456', saltRounds);
  const studentPassword = await bcrypt.hash('123456', saltRounds);
  const instructorPassword = await bcrypt.hash('123456', saltRounds);

  // Create Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: { role: 'ADMIN' },
    create: {
      email: 'admin@gmail.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log('Admin created:', admin.email);

  // Create Student
  const student = await prisma.user.upsert({
    where: { email: 'student@gmail.com' },
    update: { role: 'STUDENT' },
    create: {
      email: 'student@gmail.com',
      name: 'Student User',
      password: studentPassword,
      role: 'STUDENT',
    },
  });
  console.log('Student created:', student.email);

  // Create Instructor
  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@gmail.com' },
    update: { role: 'INSTRUCTOR' },
    create: {
      email: 'instructor@gmail.com',
      name: 'Instructor User',
      password: instructorPassword,
      role: 'INSTRUCTOR',
    },
  });
  console.log('Instructor created:', instructor.email);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seeding completed successfully.');
  })
  .catch(async (e) => {
    console.error('Error seeding data:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
