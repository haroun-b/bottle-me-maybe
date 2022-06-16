const Crate = require(`../models/crate.model`);

function reserveCrate(crateId, userId) {
  if (mongoose.isValidObjectId(crateId)) {
    return Crate.findOneAndUpdate({ _id: crateId, "responder.user": null }, { responder: { user: userId } });
  }

  // handle other case
}

function handleError(error) {
  try {
    console.log(error);


  } catch (error) {
    next(error);
  }
}


module.exports = {
  handleError,

}