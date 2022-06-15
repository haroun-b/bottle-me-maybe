const Crate = require(`../models/crate.model`);

function reserveCrate(crateId, userId) {
  if (mongoose.isValidObjectId(crateId)) {
    return Crate.findOneAndUpdate({ _id: crateId, "responder.user": null }, { responder: { user: userId } });
  }

  // handle other case
}

function constructErrorResponse(eStatus, type, message) {
  const errors = {
    [type]: [],
  }
}

function handleError(err, res, next) {
  try {
    console.log(err);
    const errors = [];

    if (!err.errors) {
      err.errors = [err];
    }

    for (let e in err.errors) {
      e = err.errors[e];

      switch (e.kind) {
        case `ObjectId`:
          errors.push(`${req.documentInfo.model}: ${req.documentInfo.id} does not exist.`);
          break;
        case `required`:
          errors.push(`${e.path} is required`);
          break;
        case `enum`:
          errors.push(`${e.value} is not a valid ${e.path}. Please choose one of the following: ${e.properties.enumValues.join(`; `)}`);
          break;
        default:
          errors.push(`${e.stringValue} is not a valid ${e.path}`);
      }
    }

    res.status(400).json({errors});
  } catch (error) {
    next(error);
  }
}


module.exports = {
  handleError,

}