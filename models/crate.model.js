const { Schema, model } = require(`mongoose`);

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
// findByIdAndReserve: returns a promise when resolved, finds a crate by id; updates 'responder.user' to the specified userId; and returns the updated crate

crateSchema.statics.findByIdAndReserve = function (crateId, userId) {
  return this.findOneAndUpdate(
    {
      _id: crateId,
      $or: [{ "responder.user": null }, { "responder.user": userId }]
    },
    { responder: { user: userId, isAnonymous: true } },
    { new: true }
  );
}

// ==========================================================
// findByIdAndUnreserve: returns a promise when resolved, finds a crate by id where 'responder.user' === userId; updates 'responder.user' to null; and returns the updated crate

crateSchema.statics.findByIdAndUnreserve = function (crateId, userId) {
  return this.findOneAndUpdate(
    { _id: crateId, "responder.user": userId },
    { responder: { user: null, isAnonymous: true } },
    { new: true }
  );
}

// ==========================================================

const Crate = model(`Crate`, crateSchema);


module.exports = Crate;