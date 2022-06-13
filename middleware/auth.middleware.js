const jwt = require('jsonwebtoken'),
  router = require(`express`).Router(),
  User = require('../models/user.model');


async function auth(req, res, next) {
  try {
    // gets the bearer token from the header
    const { authorization } = req.headers;

    // isolates the jwt
    const token = authorization.split(` `)[1];

    // verify the jwt with the jsonwebtoken package
    const payload = jwt.verify(token, process.env.TOKEN_SECRET);
    const foundUser = await User.find({ username: payload.username });

    if (foundUser.length) {
      req.user = {id: foundUser._id, username: foundUser.username};
    } else {
      delete req.user;
    }

    next();
  } catch (error) {
    next(error);
  }
}


module.exports = auth;