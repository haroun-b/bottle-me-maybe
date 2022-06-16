const router = require(`express`).Router();
const mongoose = require("mongoose");
const Bottle = require(`../models/bottle.model`);
const Crate = require(`../models/crate.model`);
const User = require(`../models/user.model`);
const View = require("../models/view.model");
const geoip = require("geoip-lite");

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
      randomBottle = await Bottle.findOne({ crate: randomCrate._id });
    let bottleAuthor = `Anonymous`;

    if (!randomCrate.creator.isAnonymous) {
      bottleAuthor = await User.findById(randomBottle.author, { username: 1 });
    }

    const bottleViews = await View.count({ bottle: randomBottle.id });

    randomBottle._doc.author = bottleAuthor;
    randomBottle._doc.views = bottleViews;
    res.status(200).json({
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
    const foundBottle = await Bottle.findById(req.params.id);

    if (!foundBottle) {
      res
        .status(404)
        .json({ message: `No such bottle with id: ${req.params.id}.` });
    }

    const bottleViews = await View.find(
      { bottle: foundBottle.id },
      { _id: 1, createdAt: 1, location: 1 }
    );

    res.status(200).json(bottleViews);
  } catch (error) {
    next(error);
  }
});

router.use(require(`../middleware/access-restricting.middleware`));

router.post(`/`, async (req, res, next) => {
  // condition: author cannot reply to own first bottle

  /*
  request:
  req.user: {
    id,
    username
  }
  body: {
    message: string,
    crateId[optional]: string,   // undefined for first bottles
    revealUsername[optional]: boolean, // undefined for all except first bottles
  }
  */
  try {
    const { user } = req;
    const { message, crateId, revealUsername } = req.body;
    let crate;

    if (!crateId) {
      const creator = { user: user.id };
      if (revealUsername) {
        creator.isAnonymous = revealUsername;
      }
      crate = await Crate.create({ creator });
    } else if (mongoose.isValidObjectId(crateId)) {
      // check that crate exists
      const foundCrate = await Crate.findById(crateId);

      if (!foundCrate) {
        res.status(404).json({ message: `no such crate with id: ${crateId}.` });
        return;
      }
      if (
        foundCrate.creator.user.toString() === user.id &&
        !foundCrate.responder.user
      ) {

        res.status(403).json({
          message: `Cannot reply until this bottle is picked by another user`,
        });
        return;
      }

      crate = foundCrate;
    } else {
      // error invalid crateId
      res.status(400).json({ message: `${crateId} is not a valid crate id.` });
      return;
    }

    await Crate.findByIdAndUpdate(crate.id, { "responder.user": user.id });

    const createdBottle = await Bottle.create({
      author: user.id,
      crate: crate._id,
      message: message,
    });

    res.status(201).json(createdBottle);
  } catch (error) {
    next(error);
  }
});
router.patch(`/:id`, async (req, res, next) => {
  /*
  request:
  req.user: {
    id,
    username
  }
  body: {
    message: string,
  }
  */
  try {
    const foundBottle = await Bottle.findById(req.params.id).populate(`crate`);

    if (!foundBottle) {
      // 404
      res
        .status(404)
        .json({ message: `No such bottle with id: ${req.params.id}.` });
      return;
    }

    const { crate } = foundBottle;

    if (crate.responder.user || crate.isArchived) {
      //  not possible to update a bottle that is part of a conversation

      res.status(403).json({
        message: `Cannot update the bottle with id: ${req.params.id}, because it is part of a conversation.`,
      });
      return;
    }

    const { message } = req.body;
    const updatedMessage = await Bottle.findByIdAndUpdate(
      req.params.id,
      { message },
      { new: true }
    );

    res.status(200).json(updatedMessage);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
