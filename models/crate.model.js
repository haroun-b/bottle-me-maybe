const { Schema, model } = require(`mongoose`);


const crateSchema = new Schema(
  {
    isArchived: Boolean,
    creator: {
      id: {
        type: Schema.Types.ObjectId,
        ref: `User`,
        required: true
      },
      isAnonymous: Boolean
    },
    responder: {
      id: {
        type: Schema.Types.ObjectId,
        ref: `User`,
        required: true
      },
      isAnonymous: Boolean
    }
  },
  {
    timestamps: true
  }
);

const Crate = model(`Crate`, crateSchema);

module.exports = Crate;