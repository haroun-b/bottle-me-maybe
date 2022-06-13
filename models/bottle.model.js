const { Schema, model } = require(`mongoose`);


const bottleSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: `User`,
      required: true
    },
    crate: {
      type: Schema.Types.ObjectId,
      ref: `Crate`,
      required: true
    },
    message: {
      type: String,
      required: true,
      maxlength: 300
    }
  },
  {
    timestamps: true
  }
);

const Bottle = model(`Bottle`, bottleSchema);

module.exports = Bottle;


