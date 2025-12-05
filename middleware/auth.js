const jwt = require("jsonwebtoken");
const User = require("../models/Users");

module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization;
  // console.log("Auth Header:", req.headers.authorization);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, 'SDFASDFASDFASDFASDFSDFASDFASRSFADF');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Token is invalid" });
  }
};
