const mongoose = require(`mongoose`);
const Crate = require(`../models/crate.model`);


function reserveCrate(crateId, userId) {
  if (isValidId(crateId)) {
    return Crate.findOneAndUpdate({ _id: crateId, "responder.user": null }, { responder: { user: userId } });
  }
}

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

function handleInvalidId(id, res) {
  res.status(400)
    .json({
      errors: {
        id: `${id} is not a valid id`
      }
    });
}

function handleNotExist(key, value, res) {
  res.status(404)
    .json({
      errors: {
        [key]: `${value} does not exist`
      }
    });
}

function isValidPasswd(password) {
  return typeof password === `string` && password.length > 7;
}

function handleInvalidPasswd(res) {
  res.status(400)
    .json({
      errors: {
        password: `password must of type: 'string'. With at least 8 characters`
      }
    });
}

function handleTokenError(err, res, next) {
  try {
    let authentication = ``;

    if (err.message.includes(`jwt expired`)) {
      authentication = `Expired token. Please login to continue`;
    } else {
      authentication = `Invalid token`;
    }

    res.status(401).json({ authentication });
  } catch (err) {
    next(err);
  }
}

function handleSchemaError(err, res, next) {
  try {
    const errors = {};

    if (!err.errors) {
      err.errors = [err];
    }

    for (let e in err.errors) {
      e = err.errors[e];

      switch (e.kind) {
        case `required`:
          errors[e.path] = `${e.path} is required`;
          break;
        case `string`:
          errors[e.path] = `${e.path} must be of type: 'string'`;
          break;
        default:
          errors[e.path] = `${e.path} ${e.message}`;
      }
    }

    res.status(400).json({ errors });
  } catch (err) {
    next(err);
  }
}


module.exports = {
  reserveCrate,
  isValidId,
  handleInvalidId,
  handleNotExist,
  isValidPasswd,
  handleInvalidPasswd,
  handleTokenError,
  handleSchemaError
}