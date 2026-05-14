import "colors";

import { Redis } from "@upstash/redis";
import { envConfig } from "./envConfig.js";

if (!envConfig.REDIS_CONFIG.REDIS_URL || !envConfig.REDIS_CONFIG.REDIS_TOKEN) {
  throw new Error(" Missing Upstash Redis environment variables".bgYellow.black);
}

export const redis = new Redis({
  url: envConfig.REDIS_CONFIG.REDIS_URL,
  token: envConfig.REDIS_CONFIG.REDIS_TOKEN,
});

export const connectRedis = async () => {
  try {
    const result = await redis.ping();

    console.log(" Upstash Redis connected successfully".green);
    console.log("Ping:".america, result.bgBlue);

    return true;
  } catch (error) {
    console.error(" Redis connection failed".red);
    console.error(error);

    process.exit(1);
  }
};
