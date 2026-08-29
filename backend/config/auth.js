const jwt = require("jsonwebtoken");

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to a strong value (at least 32 characters)");
  }
  return secret;
};

const signToken = (payload) => jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
const verifyToken = (token) => jwt.verify(token, getJwtSecret());

module.exports = { signToken, verifyToken };
