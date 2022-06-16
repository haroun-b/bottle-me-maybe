const { Schema, model } = require(`mongoose`);


const userSchema = new Schema(
  {
    username: {
      type: String,
      unique: [true, `already exists. Try logging in instead`],
      required: true,
      maxLength: [20, `must not exceed 20 characters in length`],
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true,
      minLength: 8
    },
    email: {
      type: String,
      validate: {
        validator: (str) => {
          if (str.length > 254) {
            return false;
          }
          if (str.split(`@`)[0].length > 64) {
            return false;
          }

          const emailRegex = /^[a-z][-_+\.]?(([a-z]|\d)+[-_+\.]?)+([a-z]|\d)@(([a-z]|\d)+-?)+([a-z]|\d)(\.[a-z](([a-z]|\d)-?){0,30}([a-z]|\d))$/g;

          return str.match(emailRegex) !== null;
        },
        message: email => `${email.value} is not a valid email`
      }
    },
    dailyQuota: {
      for: {
        type: Date,
        default: () => Date.now()
      },
      newBottles: {
        type: Number,
        default: 20
      }
    }
  },
  {
    timestamps: true
  }
);

const User = model(`User`, userSchema);

module.exports = User;