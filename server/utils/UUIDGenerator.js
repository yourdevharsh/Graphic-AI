const { randomUUID } = require("crypto");

function getUUID() {
  return randomUUID();
}

module.exports = getUUID;
