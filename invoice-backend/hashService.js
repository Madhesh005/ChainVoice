const crypto = require("crypto");

function generateHash(canonicalObject) {
  const jsonString = JSON.stringify(canonicalObject);
  return crypto.createHash("sha256").update(jsonString).digest("hex");
}

module.exports = { generateHash };