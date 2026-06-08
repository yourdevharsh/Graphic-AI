const getHash = require("../utils/hashGenerator");

function hashPrompt(req, res, next) {
  const { userPrompt } = req.body;
  req.userPrompt = userPrompt.trim();

  const hashedPrompt = getHash(userPrompt);
  req.hashedPrompt = hashedPrompt;
  next();
}

module.exports = hashPrompt;