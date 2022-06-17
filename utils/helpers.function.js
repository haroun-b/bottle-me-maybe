const mongoose = require(`mongoose`);
const Bottle = require(`../models/bottle.model`);
const Crate = require(`../models/crate.model`);


function reserveCrate(crateId, userId) {
  if (isValidId(crateId)) {
    return Crate.findOneAndUpdate({ _id: crateId, "responder.user": null }, { responder: { user: userId } });
  }
}

async function structureCrate(crate, user) {
  const [newestBottle] = await Bottle.find(
    { crate: crate.id },
    { author: 1, message: 1, _id: 0 },
    { sort: { createdAt: -1 }, limit: 1 }
  );

  const crateCreator = getCrateParticipant(crate, user, `creator`);
  const crateResponder = getCrateParticipant(crate, user, `responder`);

  if (newestBottle) {
    newestBottle._doc.author =
      newestBottle.author.equals(crate.creator.user.id)
        ? crateCreator
        : crateResponder;
    crate._doc.newestBottle = newestBottle;
  }

  crate._doc.creator = crateCreator;
  crate._doc.responder = crateResponder;
}

function getCrateParticipant(crate, user, participant) {
  let result = {};

  if (!crate[participant].user) {
    result = null;
  } else if (
    crate[participant].isAnonymous &&
    crate[participant].user.id !== user.id
  ) {
    result.user = `Anonymous`;
    result.isAnonymous = true;
  } else {
    result.user = crate[participant].user.username;
    result.isAnonymous = crate[participant].isAnonymous;
  }

  return result;
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

function handleNotExist(key, value, res) {
  res.status(404)
    .json({
      errors: {
        [key]: `'${value}' does not exist`
      }
    });
}


module.exports = {
  reserveCrate,
  structureCrate,
  getCrateParticipant,
  isValidId,
  handleInvalidId,
  handleNotExist,
  isValidPasswd,
  handleInvalidPasswd
}