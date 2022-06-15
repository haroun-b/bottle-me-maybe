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
      },
    },
  },
  {
    timestamps: true,
  }
);

const Crate = model(`Crate`, crateSchema);

module.exports = Crate;
