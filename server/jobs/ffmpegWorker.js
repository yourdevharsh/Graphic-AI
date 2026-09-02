const { Worker } = require("bullmq");
const { path } = require("path");
const redisClient = require("../config/redisClient");

const ffmpegWorker = new Worker(
  "ffmpeg-queue",
  path.join(__dirname, "ffmpegProcessor.js"),
  {
    connection: redisClient,
    concurrency: 2,
  },
);
