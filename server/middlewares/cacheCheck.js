const redisClient = require("../config/redisClient");
const getUUID = require("../utils/UUIDGenerator");

async function checkKey(req, res, next) {
  const hashedPrompt = req.hashedPrompt;
  const cacheExists = await redisClient.exists(`video:${hashedPrompt}`);
  if (cacheExists == 1) {
    const videoUrl = `http://localhost:3000/videos/${hashedPrompt}`;
    return res.json({ message: "Success", videoUrl: videoUrl });
  }

  const activeJobId = await redisClient.get(`activeJob:${hashedPrompt}`);
  if (activeJobId == 1) {
    return res.status(202).json({ message: "Processing", jobId: activeJobId });
  }

  const newJobId = getUUID();
  redisClient.set(`activeJob:${hashedPrompt}`, newJobId);
  
  return res.status(202).json({ message: "Processing", jobId: newJobId });
}

module.exports = checkKey;
