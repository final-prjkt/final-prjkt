const User = require('../models/user');
var crypto = require('crypto');
var jwt = require('jsonwebtoken');
const { exception } = require('console');
const { mongo } = require('mongoose');

const KEY = "FIJ2FKLSDG02G03G8DSKLFJKL2103FDS";


const generateJWT = async function (userName) {
  return jwt.sign({ user_name: userName }, KEY);
};

const validateJWT = function (token, userName) {
  const decoded = jwt.verify(token, KEY);
  return userName === decoded.user_name;
};

const hash = async function (password) {
  return new Promise((resolve, reject) => {
    // generate random 16 bytes long salt
    const salt = crypto.randomBytes(16).toString("hex");

    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ":" + derivedKey.toString("hex"));
    });
  });
};

const verify = async function (password, hash) {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(":");
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(key == derivedKey.toString("hex"));
    });
  });
};

const createNewUser = async function (userName, password) {
  // Determine if user exists
  const users = await User.find({ userName: userName });

  // If user already exists in database return
  if (users.length != 0) {
    return false;
  }

  // Hash/Salted password
  const saltyPassword = await hash(password);
  try {
    const user = new User({ userName: userName, passwordHash: saltyPassword });
    const success = await user.save();
    console.log(success);
    return true;
  } catch (e) {
    console.log("error: " + e);
    return false;
  }
};

const isAuthenticated = async function (req, res, next) {
  // Parse token and Username
  const token = req.session.token;
  const userName = req.session.user_name;

  // Validate token/username
  if (token === undefined || !token || !userName || userName === undefined) {
    next();
    return;
  }

  const success = validateJWT(token, userName);

  // Add userdata
  if (success) {
    req.user_data = { user_name: userName };
  }

  next();
};

const authenticateUser = async function (userName, password) {
  const users = await User.find({ userName: userName });

  // Determine if there is a user in the database
  if (users.length === 0) {
    return false;
  }

  // TODO: HACK
  const user = users[0];

  // Hash password
  const success = await verify(password, user.passwordHash);

  // Check if hashes match
  if (!success) {
    return false;
  }
  return true;
};

module.exports = {
  authenticateUser,
  generateJWT,
  validateJWT,
  createNewUser,
  isAuthenticated,
};