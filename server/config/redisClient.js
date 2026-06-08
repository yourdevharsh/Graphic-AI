const { createClient } = require("redis");

const client = createClient({
  url: `redis://localhost:${process.env.REDIS_SERVER_PORT}`
});

client.on("error", (err) => console.error("Redis client error: ", err));

await client.connect();
console.log("Redis server connected.")

module.exports = client;