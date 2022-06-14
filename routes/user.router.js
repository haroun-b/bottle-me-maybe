const router = require(`express`).Router();
const bcrypt = require(`bcryptjs`);
const jwt = require(`jsonwebtoken`);
const mongoose = require(`mongoose`);
const Crate = require("../models/crate.model");
const User = require("../models/user.model");

router.post("/signup", async (req, res, next) => {
  try {
    const { username, password, email, crateId } = req.body;

    const foundUser = await User.findOne({ username });
    if (foundUser) {
      res
        .status(401)
        .json({ message: "Username already exists. Try logging in instead." });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log({ hashedPassword });

    const user = {
      username,
      password: hashedPassword
    };
    if (email) {
      user.email = email;
    }

    const createdUser = await User.create(user);

    if (crateId && mongoose.isValidObjectId(crateId)) {
      await Crate.findByIdAndUpdate(crateId, { responder: { user: createdUser._id } });
    }

    const authToken = jwt.sign({ username }, process.env.TOKEN_SECRET, {
      algorithm: "HS256",
      expiresIn: "12h",
    });

    res.status(201).json({ username, authToken });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  const { username, password, crateId } = req.body;
  const foundUser = await User.findOne({ username });

  if (!foundUser) {
    res.status(404).json({ message: "username does not exist" });
    return;
  }

  const isPasswordMatched = await bcrypt.compare(password, foundUser.password);
  if (!isPasswordMatched) {
    res.status(401).json({ message: "password does not match" });
    return;
  }

  if (crateId && mongoose.isValidObjectId(crateId)) {
    await Crate.findByIdAndUpdate(crateId, { responder: { user: foundUser._id } });
  }

  const authToken = jwt.sign({ username }, process.env.TOKEN_SECRET, {
    algorithm: "HS256",
    expiresIn: "12h",
  });

  res.status(200).json({ username, authToken });
});

// reset password
router.patch(`/reset-password`, async (req, res, next) => {
  try {
    const { username } = req.body;
    const { password } = req.body;
    let resetToken = req.query.token;

    if (resetToken) {
      const payload = jwt.verify(resetToken, process.env.TOKEN_SECRET);
      if (!password) {
        res.status(400).json({ message: `Please provide a new password` });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await User.findOneAndUpdate({ username: payload.username }, { password: hashedPassword });

      res.status(200).json({ message: `You've successfully updated your password. Please login to continue.` });
    }

    if (!username) {
      // res.status(200).sendFile()   // send html form
      res.status(200).json({ message: `Please send your username in the body.` });    //temp
      return;
    }

    const foundUser = await User.findOne({ username });

    if (!foundUser) {
      res.status(400).json({ message: `No such user by the name: ${username}` });
      return;
    }
    if (!foundUser.email) {
      res.status(400).json({ message: `${username} did not provide an email during signup` });
      return;
    }


      // send the user a reset link via email
      token = jwt.sign({ username }, process.env.TOKEN_SECRET, {
        algorithm: "HS256",
        expiresIn: "5m",
      });

      res.status(200).json({ resetLink: `${process.env.BASE_URL}/user/reset-password/?token=${token}` });    // temp
      return;

  } catch (error) {
    next(error);
  }
  /*
    request:
    req.query.token: `asihfij0293urjpefm0pjfw0`
    body: {
    password: string,
  }
  */
})


router.use(require(`../middleware/auth.middleware`));
router.use(require(`../middleware/access-restricting.middleware`));

router.delete(`/`, async (req, res, next) => {
  try {
    await User.findByIdAndDelete(user.id);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
