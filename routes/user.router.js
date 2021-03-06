const {
  isValidPasswd,
  handleInvalidPasswd,
  handleNotExist
} = require(`../utils/helpers.function`),
  router = require(`express`).Router(),
  User = require(`../models/user.model`),
  Crate = require(`../models/crate.model`),
  bcrypt = require(`bcryptjs`),
  jwt = require(`jsonwebtoken`),
  nodemailer = require(`nodemailer`);

// ==========================================================
// signup
// ==========================================================
router.post(`/signup`, async (req, res, next) => {
  try {
    const { username, password, email, crateId } = req.body;

    if (!isValidPasswd(password)) {
      handleInvalidPasswd(res, next);
      return;
    }

    const salt = await bcrypt.genSalt(10),
      hashedPassword = await bcrypt.hash(password, salt);

    const user = {
      username,
      password: hashedPassword
    };
    if (email) {
      user.email = email;
    }

    const createdUser = await User.create(user);

    if (crateId) {
      await Crate.findByIdAndReserve(crateId, createdUser.id);
    }

    const authToken = jwt.sign({ username }, process.env.TOKEN_SECRET, {
      algorithm: `HS256`,
      expiresIn: `12h`,
    });

    res.status(201).json({ username, authToken });
  } catch (err) {
    next(err);
  }
});
// ==========================================================

// ==========================================================
// login
// ==========================================================
router.post(`/login`, async (req, res, next) => {
  try {
    const { username, password, crateId } = req.body;

    if (!isValidPasswd(password)) {
      handleInvalidPasswd(res, next);
      return;
    }

    const foundUser = await User.findOne({ username });
    if (!foundUser) {
      handleNotExist(`username`, username, res);
      return;
    }

    const isPasswordMatched = await bcrypt.compare(password, foundUser.password);
    if (!isPasswordMatched) {
      res.status(401)
        .json({
          errors: {
            password: `Wrong password`
          }
        });
      return;
    }

    if (crateId) {
      await Crate.findByIdAndReserve(crateId, foundUser.id);
    }

    const authToken = jwt.sign({ username }, process.env.TOKEN_SECRET, {
      algorithm: `HS256`,
      expiresIn: `12h`,
    });

    res.status(200).json({ username, authToken });
  } catch (err) {
    next(err);
  }
});
// ==========================================================

// ==========================================================
// reset the user's password
// ==========================================================
router.patch(`/reset-password`, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    let resetToken = req.query.token;

    if (resetToken) {
      const { username } = jwt.verify(resetToken, process.env.TOKEN_SECRET);
      if (!password) {
        res.status(400)
          .json({
            errors: {
              password: `To reset your password, please provide a new one`
            }
          });
        return;
      }

      if (!isValidPasswd(password)) {
        handleInvalidPasswd(res);
        return;
      }

      const salt = await bcrypt.genSalt(10),
        hashedPassword = await bcrypt.hash(password, salt);

      await User.findOneAndUpdate({ username }, { password: hashedPassword });

      res.status(200).json({ message: `You've successfully updated your password! Please login to continue.` });
    }

    if (!username) {
      res.status(400)
        .json({
          errors: {
            username: `To reset your password, please provide a username`
          }
        });
      return;
    }

    const foundUser = await User.findOne({ username });
    if (!foundUser) {
      handleNotExist(`username`, username, res);
      return;
    }
    if (!foundUser.email) {
      res.status(403)
        .json({
          errors: {
            email: `Password reset not possible. ${username} did not provide an email during signup`
          }
        });
      return;
    }

    resetToken = jwt.sign({ username }, process.env.TOKEN_SECRET, {
      algorithm: `HS256`,
      expiresIn: `5m`,
    });


    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    // use .env for the from field
    const emailResMsg = await transporter.sendMail({
      from: `'Bottle Me Maybe ' <${process.env.EMAIL_USERNAME}>`,
      to: foundUser.email,
      subject: 'Password Reset Link',
      text: `${process.env.BASE_URL}/user/reset-password/?token=${resetToken}`
    });

    console.log(emailResMsg);

    res.status(200).json({ message: `A password reset link was sent to your email!` });
  } catch (err) {
    next(err);
  }
});
// ==========================================================

// ==========================================================
// auth
// ==========================================================
router.use(require(`../middleware/auth.middleware`));
router.use(require(`../middleware/access-restricting.middleware`));
// ==========================================================

// ==========================================================
// delete user account
// ==========================================================
router.delete(`/`, async (req, res, next) => {
  try {
    const { user } = req;

    const allCrates = await Crate.find(
      { $or: [{ "creator.user": user.id }, { "responder.user": user.id }] },
      { __v: 0 })
      .populate(`creator.user`)
      .populate(`responder.user`);

    if (allCrates.length) {
      const promises = [];

      allCrates.forEach(crate => {
        promises.push(Crate.abandon(crate, user));
      });

      await Promise.all(promises.flat());
    }

    await User.findByIdAndDelete(user.id);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});
// ==========================================================


module.exports = router;