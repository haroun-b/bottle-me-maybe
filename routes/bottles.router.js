const { handleError } = require("../utils/helpers.function"),
  router = require(`express`).Router(),
  Bottle = require(`../models/bottle.model`),
  Crate = require(`../models/crate.model`),
  User = require(`../models/user.model`),
  View = require("../models/view.model"),
  geoip = require("geoip-lite");

router.use(require(`../middleware/auth.middleware`));

router.get(`/random`, async (req, res, next) => {
  try {
    const query = { "responder.user": null, isArchived: false };

    // users shouldn't get their own bottles
    const { user } = req;
    if (user) {
      query["creator.user"] = { $ne: user.id };
    }

    const floatingCrates = await Crate.find(query, { _id: 1, creator: 1 });

    if (!floatingCrates.length) {
      res.status(200).json([]);
      return;
    }

    const randomIndex = Math.floor(Math.random() * floatingCrates.length),
      randomCrate = floatingCrates[randomIndex],
      randomBottle = await Bottle.findOne({ crate: randomCrate.id });
    let bottleAuthor = `Anonymous`;

    if (!randomCrate.creator.isAnonymous) {
      bottleAuthor = await User.findById(randomBottle.author, { username: 1 });
    }

    const bottleViews = await View.count({ bottle: randomBottle.id });

    randomBottle._doc.author = bottleAuthor;
    randomBottle._doc.views = bottleViews;

    res.status(200)
      .json({
        ...randomBottle._doc,
        replyPath: `/crates/${randomBottle.crate}/bottles`,
      });

    const { ip } = req;
    let location = null;
    if (geoip.lookup(ip)) {
      const {
        country,
        region,
        city,
        ll: [latitude, longitude],
        area: accuracyRadius,
      } = geoip.lookup(ip);

      location = {
        country,
        region,
        city,
        latitude,
        longitude,
        accuracyRadius,
      };
    }

    await View.create({ bottle: randomBottle.id, location });
  } catch (error) {
    next(error);
  }
});

router.get(`/:id/views`, async (req, res, next) => {
  try {
    const { user } = req;
    const bottleId = req.params.id

    const foundBottle = await Bottle.findById(bottleId);
    if (!foundBottle) {
      res.status(404)
        .json({
          errors: [{
            path: `bottle`,
            message: `Bottle: ${bottleId} does not exist.`
          }]
        });
      return;
    }

    const bottleViews = await View.find(
      { bottle: foundBottle.id },
      { _id: 1, createdAt: 1, location: 1 }
    );

    res.status(200).json(bottleViews);
  } catch (error) {
    handleError(error);
  }
});


router.use(require(`../middleware/access-restricting.middleware`));

router.post(`/`, async (req, res, next) => {
  try {
    const { user } = req;
    const { message, revealUsername } = req.body;

    const creator = {
      user: user.id,
      isAnonymous: !revealUsername
    };

    const createdCrate = await Crate.create({ creator });
    const createdBottle = await Bottle.create({
      author: user.id,
      crate: createdCrate.id,
      message,
    });

    res.status(201).json(createdBottle);
  } catch (error) {
    handleError(error);
  }
});

router.patch(`/:id`, async (req, res, next) => {
  try {
    const bottleId = req.params.id;
    const foundBottle = await Bottle.findById(bottleId).populate(`crate`);

    if (!foundBottle) {
      res.status(404)
        .json({
          errors: [{
            path: `bottle`,
            message: `Bottle: ${bottleId} does not exist.`
          }]
        });
      return;
    }

    const { crate } = foundBottle;

    if (crate.responder.user || crate.isArchived) {
      //  not possible to update a bottle that is part of a conversation
      res.status(403)
        .json({
          errors: [{
            path: `crate`,
            message: `Bottle: ${bottleId} cannot be updated, because it is part of a conversation.`
          }]
        });
      return;
    }

    const { message } = req.body;
    const updatedMessage = await Bottle.findByIdAndUpdate(bottleId, { message }, { new: true });

    res.status(200).json(updatedMessage);
  } catch (error) {
    handleError(error);
  }
});


module.exports = router;