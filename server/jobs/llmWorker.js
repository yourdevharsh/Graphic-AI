const { Worker } = require("bullmq");
const { path } = require("path");
const redisClient = require("../config/redisClient");

const llmWorker = new Worker(
  "llm-queue",
  path.join(__dirname, "llmProcessor.js"),
  {
    connection: redisClient,
    concurrency: 2,
  },
);
