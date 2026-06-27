const { createClient } = require("redis");

const redisClient = createClient({
  url: `redis://localhost:${process.env.REDIS_SERVER_PORT}`
});

redisClient.on("error", (err) => console.error("Redis client error: ", err));

await redisClient.connect();
console.log("Redis server connected.")

module.exports = redisClient;