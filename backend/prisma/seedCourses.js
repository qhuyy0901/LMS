import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import dotenv from 'dotenv';
import { slugify } from '../src/lib/slug.js';

dotenv.config();

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
  console.log('Clearing old courses...');
  await prisma.course.deleteMany();

  console.log('Seeding instructors and courses...');

  const instructorsData = [
    { name: 'Sophia Nguyễn', email: 'sophia@example.com', password: 'hash' },
    { name: 'Liam Trần', email: 'liam@example.com', password: 'hash' },
    { name: 'Maya Patel', email: 'maya@example.com', password: 'hash' },
    { name: 'Ethan Cruz', email: 'ethan@example.com', password: 'hash' },
  ];

  const instructors = [];
  for (const data of instructorsData) {
    let user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      user = await prisma.user.create({
        data: { ...data, role: 'INSTRUCTOR' }
      });
    } else if (user.role !== 'INSTRUCTOR') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { role: 'INSTRUCTOR' }
      });
    }
    instructors.push(user);
  }

  const coursesData = [
    {
      title: 'Design System cho ứng dụng SaaS hiện đại',
      description: JSON.stringify({
        category: 'Thiết kế',
        badge: 'Mới',
        badgeColor: 'bg-purple-600',
        icon: '🎨',
        gradient: 'from-amber-200 to-orange-300',
        rating: 4.8,
        students: 1200
      }),
      price: 599000,
      isPublished: true,
      instructorId: instructors[0].id,
      lessonsData: 24
    },
    {
      title: 'Next.js 15: Xây dựng full-stack app',
      description: JSON.stringify({
        category: 'Lập trình',
        badge: 'Hot',
        badgeColor: 'bg-red-500',
        icon: '💻',
        gradient: 'from-green-200 to-teal-300',
        rating: 4.9,
        students: 3400
      }),
      price: 899000,
      isPublished: true,
      instructorId: instructors[1].id,
      lessonsData: 42
    },
    {
      title: 'Growth Marketing: Từ 0 đến 10k users',
      description: JSON.stringify({
        category: 'Marketing',
        badge: 'Best',
        badgeColor: 'bg-amber-500',
        icon: '📈',
        gradient: 'from-blue-200 to-purple-300',
        rating: 4.7,
        students: 890
      }),
      price: 499000,
      isPublished: true,
      instructorId: instructors[2].id,
      lessonsData: 18
    },
    {
      title: 'Phân tích dữ liệu với Python & Pandas',
      description: JSON.stringify({
        category: 'Dữ liệu',
        badge: 'Free',
        badgeColor: 'bg-green-500',
        icon: '📊',
        gradient: 'from-pink-200 to-rose-300',
        rating: 4.6,
        students: 720
      }),
      price: 0,
      isPublished: true,
      instructorId: instructors[3].id,
      lessonsData: 30
    }
  ];

  for (const c of coursesData) {
    const { lessonsData, ...courseFields } = c;
    const course = await prisma.course.create({
      data: {
        ...courseFields,
        slug: `${slugify(courseFields.title)}-${Date.now()}`
      }
    });
    
    // Create dummy section
    const section = await prisma.section.create({
      data: {
        title: 'Giới thiệu',
        position: 1,
        courseId: course.id
      }
    });

    // Create dummy lessons tied to section
    const lessons = Array.from({ length: lessonsData }).map((_, i) => ({
      title: `Bài ${i + 1}`,
      position: i + 1,
      courseId: course.id,
      sectionId: section.id,
      isPublished: true
    }));
    
    await prisma.lesson.createMany({
      data: lessons
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
