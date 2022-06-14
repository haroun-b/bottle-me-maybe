const mongoose = require(`mongoose`);
const User = require("../models/user.model");
const Crate = require("../models/crate.model");
const messages = require(`./data`);
const Bottle = require("../models/bottle.model");
const bcrypt = require(`bcryptjs`);

const MONGO_URI = process.env.MONGODB_URI || `mongodb://127.0.0.1/bottle-me-maybe`;

(async function seedDB() {
  try {
    const connection = await mongoose.connect(MONGO_URI);

    console.log(`Connected to Mongo! Database name: ${connection.connections[0].name}`);

    await Promise.all([
      User.deleteMany({}),
      Crate.deleteMany({}),
      Bottle.deleteMany({})
    ]);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(`willsonwillson123`, salt);

    const user = await User.create({
      username: `chuck-noland`,
      password: hashedPassword
    });

    for (let msg of messages) {
      const { message } = msg;

      const crate = await Crate.create({
        creator: {
          user: user.id,
          isAnonymous: false
        }
      });

      const bottle = await Bottle.create({
        author: user.id,
        crate: crate.id,
        message
      });
    }

    mongoose.disconnect();
  } catch (error) {
    console.trace(error)
  }
})();