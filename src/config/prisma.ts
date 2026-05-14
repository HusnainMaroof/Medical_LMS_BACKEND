// src/config/prisma.ts

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { envConfig } from "./envConfig.js";

const adapter = new PrismaPg({
  connectionString: envConfig.DATABASE_URL,
});

const createPrismaClient = () => {
  return new PrismaClient({
    adapter,
    log:
      envConfig.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
};

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

if (envConfig.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Connect database
 */
export const connectDB = async () => {
  try {
    await prisma.$connect();

    console.log(" Database connected successfully".green);
  } catch (error) {
    console.error(" Database connection failed".red);
    console.error(error);

    process.exit(1);
  }
};

/**
 * Disconnect database
 */
export const disconnectDB = async () => {
  try {
    await prisma.$disconnect();

    console.log(" Database disconnected".green);
  } catch (error) {
    console.error(" Database disconnection failed".red);
    console.error(error);
  }
};