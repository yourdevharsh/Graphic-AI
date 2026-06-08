const crypto = require("crypto");

function getHash(string) {
  const cleanString = string.trim();
  return crypto.createHash("sha256").update(cleanString).digest("hex");
}

module.exports = getHash;
