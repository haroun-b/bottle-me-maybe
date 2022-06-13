const { Schema, model } = require(`mongoose`);


const userSchema = new Schema(
  {
    username: {
      type: String,
      unique: true,
      required: true
    },
    password: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      validate: {
        validator: (str) => {
          const regex = /^[a-z][-_+\.]?(([a-z]|\d)+[-_+\.]?)+([a-z]|\d)@(([a-z]|\d)+-?)+([a-z]|\d)(\.[a-z](([a-z]|\d)-?){0,30}([a-z]|\d))$/g;

          return str.match(regex) !== null;
        },
        message: email => `${email.value} is not a valid email!`
      }
    }
  },
  {
    timestamps: true
  }
);

const User = model(`User`, userSchema);

module.exports = User;