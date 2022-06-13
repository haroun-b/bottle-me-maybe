const router = require(`express`).Router();

router.post("/signup", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    console.log(req.body);

    const foundUser = await User.findOne({ username });
    if (foundUser) {
      res
        .status(401)
        .json({ message: "Username already exists. Try logging in instead." });
      return;
    }

    console.log(password);
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log({ hashedPassword });

    const createdUser = await User.create({
      username,
      password: hashedPassword,
    });

    res.status(201).json(createdUser);
  } catch (error) {
    console.log(error);
    next(error);
  }
  /*
    request:
    body: {
      username: string,
      password: string,
      email[optional]: string,
      crateId[optional]: string,  // included with signup and reply requests
    }
  */

  /*
  response: jwt
  */
});

router.post("/login", async (req, res, next) => {
  const { username, password } = req.body;
  const foundUser = await User.findOne({ username });

  console.log(req.body);
  if (!foundUser) {
    res.status(404).json({ message: "username does not exist" });
    return;
  }

  const isPasswordMatched = await bcrypt.compare(password, foundUser.password);
  if (!isPasswordMatched) {
    res.status(401).json({ message: "password does not match" });
    return;
  }
  const payload = { username };

  const authToken = jsonwebtoken.sign(payload, process.env.TOKEN_SECRET, {
    algorithm: "HS256",
    expiresIn: "1h",
  });

  res.status(200).json({ isLoggedIn: true, message: "Welcome " + username });
  /*
    request:
    body: {
      username: string,
      password: string,
      crateId[optional]: string,  // included with login and reply requests
    }
  */
  /*
  response: jwt
  */
});

// reset link structure: `/user/:id/?token=asihfij0293urjpefm0pjfw0`
router
  .route(`/user/:id`)
  // reset password
  .patch(`/reset-password`, async (req, res, next) => {
    /*
      request:
      req.query.token: `asihfij0293urjpefm0pjfw0`
      body: {
      password: string,
    }
    */
  })
  .delete(async (req, res, next) => {
    try {
      await User.findByIdAndDelete(req.params.id);
      res
        .status(200)
        .json({ message: `Good job, you deleted ${req.params.id}` });
    } catch (error) {
      next(error);
    }
    /*
      request:
      req.headers.authorization: `Bearer asihfij0293urjpefm0pjfw0`
    */
  });

module.exports = router;
