// src/server.ts
import { config } from "dotenv";
config(); // ← must be before ALL other imports

import "colors";
import app from "./app.js";
import { envConfig } from "./config/envConfig.js";
import { connectDB } from "./config/prisma.js";
import { connectRedis } from "./config/redis.js";

const PORT = envConfig.PORT || 5000;

await connectDB();
await connectRedis();

app.listen(PORT, () => {
  console.log(
    `Server running on ${envConfig.ORIGINS.BACKEND_ORIGIN} on PORT:${PORT} in ${envConfig.NODE_ENV} mode`.green
  );
});