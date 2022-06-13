const { Schema, model } = require(`mongoose`);


const crateSchema = new Schema(
  {
    isArchived: {
      type: Boolean,
      default: false
    },
    creator: {
      id: {
        type: Schema.Types.ObjectId,
        ref: `User`,
        required: true
      },
      isAnonymous: {
        type: Boolean,
        default: true
      },
    },
    responder: {
      id: {
        type: Schema.Types.ObjectId,
        ref: `User`,
        required: true
      },
      isAnonymous: {
        type: Boolean,
        default: true
      },
    }
  },
  {
    timestamps: true
  }
);

const Crate = model(`Crate`, crateSchema);

module.exports = Crate;