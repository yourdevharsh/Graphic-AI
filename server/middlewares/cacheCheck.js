const client = require("../config/redisClient");

async function checkKey() {
  return (req, res, next) => {
    const hashedPrompt = req.hashedPrompt;
    const result = client.exists(hashedPrompt);
    if (result == 1) {
      return getVideoFromDb(res, req, next);
    } else {
      return 
    }
  }
}

module.exports = checkKey;
