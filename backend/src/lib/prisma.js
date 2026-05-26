import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

const parseSqlServerConnection = (url) => {
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }

  const cleanUrl = url.replace(/^sqlserver:\/\//i, '');
  const [serverPart, ...rawOptions] = cleanUrl.split(';').filter(Boolean);
  const [server, port] = serverPart.split(':');
  const options = rawOptions.reduce((acc, item) => {
    const separatorIndex = item.indexOf('=');
    if (separatorIndex === -1) {
      return acc;
    }

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

const adapter = new PrismaMssql(parseSqlServerConnection(connectionString));
const prisma = new PrismaClient({ adapter });

export default prisma;
