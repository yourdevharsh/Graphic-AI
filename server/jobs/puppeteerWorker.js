const { Worker } = require("bullmq");
const { path } = require("path");
const redisClient = require("../config/redisClient");

const puppeteerWorker = new Worker(
  "puppeteer-queue",
  path.join(__dirname, "puppeteerProcessor.js"),
  {
    connection: redisClient,
    concurrency: 2,
  },
);
