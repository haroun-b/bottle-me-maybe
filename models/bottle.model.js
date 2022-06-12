const { Schema, model } = require(`mongoose`);


const bottleSchema = new Schema(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      ref: `User`,
      required: true
    },
    crateId: {
      type: Schema.Types.ObjectId,
      ref: `Crate`,
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 300
    },
    latestFetch: {
      userId: {
        type: Schema.Types.ObjectId,
        ref: `User`
      },
      time: Date
    }
  },
  {
    timestamps: true
  }
);

const Bottle = model(`Bottle`, bottleSchema);

module.exports = Bottle;


