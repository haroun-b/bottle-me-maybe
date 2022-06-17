const { handleNotExist } = require(`../utils/helpers.function`),
  validateId = require(`../middleware/id-validation.middleware`),
  router = require(`express`).Router(),
  Bottle = require(`../models/bottle.model`),
  Crate = require(`../models/crate.model`),
  User = require(`../models/user.model`),
  View = require("../models/view.model"),
  geoip = require("geoip-lite");

// ==========================================================
// ==========================================================
router.use(require(`../middleware/auth.middleware`));

// ==========================================================
// ==========================================================
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
      randomBottle = await Bottle.findOne({ crate: randomCrate.id }, { __v: 0 });
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
        replyPath: `${process.env.BASE_URL}/crates/${randomBottle.crate}/bottles`
      });

    const ip = req.ip.replace(`::ffff:`, ``);
    let location = null;
console.log({ip}, req.ips);


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
  } catch (err) {
    next(err);
  }
});

// ==========================================================
// ==========================================================
router.get(`/:id/views`, validateId, async (req, res, next) => {
  try {
    const { user } = req,
      bottleId = req.params.id;

    const foundBottle = await Bottle.findById(bottleId);
    if (!foundBottle) {
      handleNotExist(`bottle`, bottleId, res);
      return;
    }

    const bottleViews = await View.find(
      { bottle: bottleId },
      { _id: 1, createdAt: 1, location: 1 },
      {createdAt: -1}
    );

    res.status(200).json(bottleViews);
  } catch (err) {
    next(err);
  }
});

// ==========================================================
// ==========================================================
router.use(require(`../middleware/access-restricting.middleware`));

// ==========================================================
// ==========================================================
router.post(`/`, async (req, res, next) => {
  try {
    const { user } = req,
      { message, revealUsername } = req.body;


    let { dailyQuota } = await User.findById(user.id, { dailyQuota: 1 });

    if (Date.now() - dailyQuota.for > 86400000) {
      dailyQuota = await User.findByIdAndUpdate(
        user.id,
        { dailyQuota: { for: Date.now(), newBottles: 20 } },
        { new: true, select: { dailyQuota: 1 } }
      );
    }
    const remainingQuota = dailyQuota.newBottles;
    if (remainingQuota < 1) {
      res.status(403)
        .json({
          errors: {
            quota: `You've exceeded your daily quota for new bottles. You can always reply to other people's bottles`
          }
        });
      return;
    }

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

    delete createdBottle._doc.__v;
    res.status(201).json(createdBottle);

    await User.findByIdAndUpdate(
      user.id,
      { dailyQuota: { newBottles: remainingQuota - 1 } }
    );
  } catch (err) {
    next(err);
  }
});

// ==========================================================
// ==========================================================
router.patch(`/:id`, validateId, async (req, res, next) => {
  try {
    const { user } = req,
      bottleId = req.params.id;

    const foundBottle = await Bottle.findOne({ _id: bottleId, author: user.id })
      .populate(`crate`);
    if (!foundBottle) {
      handleNotExist(`bottle`, bottleId, res);
      return;
    }

    const { crate } = foundBottle;

    if (crate.responder.user || crate.isArchived) {
      //  not possible to update a bottle that is part of a conversation
      res.status(403)
        .json({
          errors: {
            bottle: `${bottleId} cannot be updated, because it is part of a conversation`
          }
        });
      return;
    }

    const { message } = req.body;
    const updatedMessage = await Bottle.findByIdAndUpdate(bottleId, { message }, { new: true, runValidators: true, select: { __v: 0 } });

    res.status(200).json(updatedMessage);
  } catch (err) {
    next(err);
  }
});


module.exports = router;