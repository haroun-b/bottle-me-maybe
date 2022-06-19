const { Schema, model } = require(`mongoose`),
  Bottle = require(`./bottle.model`);

const crateSchema = new Schema(
  {
    isArchived: {
      type: Boolean,
      default: false,
    },
    creator: {
      user: {
        type: Schema.Types.ObjectId,
        ref: `User`,
        required: true,
      },
      isAnonymous: {
        type: Boolean,
        default: true,
      },
    },
    responder: {
      user: {
        type: Schema.Types.ObjectId,
        ref: `User`,
        default: null,
      },
      isAnonymous: {
        type: Boolean,
        default: true,
      }
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================================
// model statics
// ==========================================================
// ==========================================================
// findByIdAndReserve
// ==========================================================
// findByIdAndReserve: returns a promise when resolved, finds a crate by id; updates 'responder.user' to the specified userId; and returns the updated crate

crateSchema.statics.findByIdAndReserve = function (crateId, userId, isAnonymous = true) {
  return this.findOneAndUpdate(
    {
      _id: crateId,
      isArchived: false,
      $or: [{ "responder.user": null }, { "responder.user": userId }],
      "creator.user": { $ne: userId }
    },
    { responder: { user: userId, isAnonymous } },
    { new: true }
  );
}

// ==========================================================
// findByIdAndUnreserve
// ==========================================================
// findByIdAndUnreserve: returns a promise when resolved, finds a crate by id where 'responder.user' === userId; updates 'responder.user' to null; and returns the updated crate

crateSchema.statics.findByIdAndUnreserve = function (crateId, userId) {
  return this.findOneAndUpdate(
    {
      _id: crateId,
      isArchived: false,
      "responder.user": userId
    },
    { responder: { user: null, isAnonymous: true } },
    { new: true }
  );
}

// ==========================================================
// abandon
// ==========================================================
/*
abandon takes 2 objects as arguments. a crate and a user.

it returns an array of promises of length === 2.
  promises[0]: when resolved, either deletes the crates. or archives it and updates the participant which equals the user to be null.

  promises[1]: when resolved, either deletes all the crate's bottles for this user. or updates the author on every bottle to be null.

abandon only deletes when the crate has only one participant left.
*/

crateSchema.statics.abandon = function (crate, user) {
  if (!crate.isArchived && crate.responder.user) {
    const promises = [];

    if (crate.creator.user.id === user.id) {
      promises.push(this.findByIdAndUpdate(crate.id, {
        "creator.user": null,
        isArchived: true,
      }));
    } else {
      promises.push(this.findByIdAndUpdate(crate.id, {
        "responder.user": null,
        isArchived: true,
      }));
    }

    promises.push(Bottle.updateMany(
      { author: user.id, crate: crate.id },
      { author: null }));

    return promises;
  }

  return [
    this.findByIdAndDelete(crate.id),
    Bottle.deleteMany({ crate: crate.id })
  ];
}

// ==========================================================
// getParticipant
// ==========================================================
/*
getParticipant takes 3 arguments: a crate object; a user object; and a string specifying which user to get: 'creator' or 'responder'.

it returns:
  null if crate[participant].user === null.

  {user, isAnonymous} otherwise.
    the value of user depends on isAnonymous and the user object passed as argument.
    user === username when isAnonymous is false and user.id !== [participant]
    otherwise user === 'Anonymous'.
*/

crateSchema.statics.getParticipant = function (crate, user, participant) {
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

// ==========================================================
// structure
// ==========================================================
/*
structure takes 2 objects as arguments. a crate and a user.

it appends to the crate its newest bottle. and it uses getParticipant to update the crate's participants an the bottle's author accordingly.
*/

crateSchema.statics.structure = async function (crate, user) {
  const [newestBottle] = await Bottle.find(
    { crate: crate.id },
    { author: 1, message: 1, _id: 0 },
    { sort: { createdAt: -1 }, limit: 1 }
  );

  const crateCreator = this.getParticipant(crate, user, `creator`);
  const crateResponder = this.getParticipant(crate, user, `responder`);

  if (newestBottle) {
    newestBottle._doc.author =
      newestBottle.author?.toString() === crate.creator.user?.id
        ? crateCreator
        : crateResponder;
    crate._doc.newestBottle = newestBottle;
  }

  crate._doc.creator = crateCreator;
  crate._doc.responder = crateResponder;
}

// ==========================================================

const Crate = model(`Crate`, crateSchema);


module.exports = Crate;