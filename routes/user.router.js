const { handleError, reserveCrate } = require(`../utils/helpers.function`),
  router = require(`express`).Router(),
  User = require(`../models/user.model`),
  bcrypt = require(`bcryptjs`),
  jwt = require(`jsonwebtoken`),
  nodemailer = require(`nodemailer`);


router.post(`/signup`, async (req, res, next) => {
  try {
    const { password, email, crateId } = req.body,
      username = req.body.username.trim();

    const foundUser = await User.findOne({ username });
    if (foundUser) {
      res.status(401)
        .json({
          errors: [{
            path: `username`,
            message: `Username already exists. Try logging in instead.`
          }]
        });
      return;
    }

    if (typeof password !== `string`) {
      res.status(400)
        .json({
          errors: [{
            path: `password`,
            message: `Password must be of type: String.`
          }]
        });
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
      await reserveCrate(crateId, createdUser.id);
    }

    const authToken = jwt.sign({ username }, process.env.TOKEN_SECRET, {
      algorithm: `HS256`,
      expiresIn: `12h`,
    });

    res.status(201).json({ username, authToken });
  } catch (error) {
    handleError(error);
  }
});

router.post(`/login`, async (req, res, next) => {
  const { username, password, crateId } = req.body;

  const foundUser = await User.findOne({ username });
  if (!foundUser) {
    res.status(404).json({
      errors: [{
        path: `username`,
        message: `Username: ${username} does not exist. Try signing up instead.`
      }]
    });
    return;
  }

  const isPasswordMatched = await bcrypt.compare(password, foundUser.password);
  if (!isPasswordMatched) {
    res.status(401)
      .json({
        errors: [{
          path: `password`,
          message: `Wrong password.`
        }]
      });
    return;
  }

  if (crateId) {
    await reserveCrate(crateId, createdUser.id);
  }

  const authToken = jwt.sign({ username }, process.env.TOKEN_SECRET, {
    algorithm: `HS256`,
    expiresIn: `12h`,
  });

  res.status(200).json({ username, authToken });
});

router.patch(`/reset-password`, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    let resetToken = req.query.token;

    if (resetToken) {
      const payload = jwt.verify(resetToken, process.env.TOKEN_SECRET);
      if (!password) {
        res.status(400)
          .json({
            errors: [{
              path: `password`,
              message: `To reset your password, please provide a new one.`
            }]
          });
        return;
      }

      if (typeof password !== `string`) {
        res.status(400)
          .json({
            errors: [{
              path: `password`,
              message: `Password must be of type: String.`
            }]
          });
        return;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await User.findOneAndUpdate({ username: payload.username }, { password: hashedPassword });

      res.status(200).json({ message: `You've successfully updated your password! Please login to continue.` });
    }

    if (!username) {
      res.status(400).json({
        errors: [{
          path: `username`,
          message: `To reset your password, please provide a username.`
        }]
      });
      return;
    }

    const foundUser = await User.findOne({ username });

    if (!foundUser) {
      res.status(404).json({
        errors: [{
          path: `username`,
          message: `Username: ${username} does not exist.`
        }]
      });
      return;
    }
    if (!foundUser.email) {
      res.status(403).json({
        errors: [{
          path: `email`,
          message: `Password reset not possible. ${username} did not provide an email during signup.`
        }]
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

    const emailResMsg = await transporter.sendMail({
      from: '`Bottle Me Maybe ` <bottle.me.maybe@gmail.com>',
      to: foundUser.email,
      subject: 'Password Reset Link',
      text: `${process.env.BASE_URL}/user/reset-password/?token=${token}`
    });

    console.log(emailResMsg);

    res.status(200).json({ message: `A password reset link was sent to your email!` });
  } catch (error) {
    handleError(error);
  }
});


router.use(require(`../middleware/auth.middleware`));
router.use(require(`../middleware/access-restricting.middleware`));
router.delete(`/`, async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.user.id);
    res.sendStatus(204);
  } catch (error) {
    handleError(error);
  }
});


module.exports = router;