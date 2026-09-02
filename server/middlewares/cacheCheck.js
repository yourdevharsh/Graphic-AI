const redisClient = require("../config/redisClient");
const getUUID = require("../utils/UUIDGenerator");
const { FlowProducer, tryCatch } = require("bullmq");
const redisClient = require("../config/redisClient");

const flow = new FlowProducer({ connection: redisClient });

async function checkKey(req, res, next) {
  const hashedPrompt = req.hashedPrompt;
  const cacheExists = await redisClient.exists(`video:${hashedPrompt}`);
  if (cacheExists == 1) {
    const videoUrl = `http://localhost:3000/videos/${hashedPrompt}`;
    return res.json({ message: "Success", videoUrl: videoUrl });
  }

  const activeJobId = await redisClient.get(`activeJob:${hashedPrompt}`);
  if (activeJobId) {
    return res.status(202).json({ message: "Processing", jobId: activeJobId });
  }

  const newJobId = getUUID();
  redisClient.set(`activeJob:${hashedPrompt}`, newJobId);

  try {
    await flow.add({
      name: "generateVideo",
      queueName: "ffmpeg-queue",
      data: {},
      opts: {
        jobId: newJobId,
      },
      children: [
        {
          name: "generateImages",
          queueName: "puppeteer-queue",
          data: {},
          opts: {
            jobId: `${newJobId}:images`,
          },
          children: [
            {
              name: "generateCode",
              queueName: "llm-queue",
              data: { prompt: userPrompt },
              opts: {
                jobId: `${newJobId}:text`,
              },
            },
          ],
        },
      ],
    });
  } catch (error) {
    await redisClient.del(`activeJob:${hashedPrompt}`);
    return res.status(500).josn({message: "Video Generation Queue Failed."});
  }

  return res.status(202).json({ message: "Processing", jobId: newJobId });
}

module.exports = checkKey;
