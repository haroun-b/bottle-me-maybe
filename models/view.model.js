const { Schema, model } = require(`mongoose`);


const viewSchema = new Schema(
  {
    bottle: {
      type: Schema.Types.ObjectId,
      ref: `Bottle`,
      required: true
    },
    location: {
      country: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number,
      accuracyRadius: Number,
    }
  },
  {
    timestamps: true
  }
);

const View = model(`View`, viewSchema);

module.exports = View;