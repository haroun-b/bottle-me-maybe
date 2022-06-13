const { Schema, model } = require(`mongoose`);


const viewSchema = new Schema(
  {
    bottleId: {
      type: Schema.Types.ObjectId,
      ref: `Bottle`,
      required: true
    },
    location: String
  },
  {
    timestamps: true
  }
);

const View = model(`View`, viewSchema);

module.exports = View;