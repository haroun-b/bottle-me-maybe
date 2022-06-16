const {
  handleError,
  structureCrate,
  handleNotExist,
  getCrateParticipant
} = require(`../utils/helpers.function`),
  validateId = require(`../middleware/id-validation.middleware`),
  router = require(`express`).Router(),
  Crate = require(`../models/crate.model`),
  Bottle = require(`../models/bottle.model`);


// ==========================================================
// ==========================================================
router.use(require(`../middleware/auth.middleware`));
router.use(require(`../middleware/access-restricting.middleware`));

// ==========================================================
// ==========================================================
// get all the crates
router.get(`/`, async (req, res, next) => {
  try {
    const { user } = req;

    const allCrates = await Crate.find(
      { $or: [{ "creator.user": user.id }, { "responder.user": user.id }] },
      { __v: 0 })
      .populate(`creator.user`)
      .populate(`responder.user`);

    for (let crate of allCrates) {
      await structureCrate(crate, user);
    }

    res.status(200).json(allCrates);
  } catch (err) {
    handleError(err, res, next);
  }
});

// ==========================================================
// ==========================================================
router.post(`/:id/bottles`, validateId, async (req, res, next) => {
  try {
    const { message, revealUsername } = req.body,
      { user } = req,
      crateId = req.params.id;

    const foundCrate = await Crate.findById(crateId);
    if (!foundCrate) {
      handleNotExist(`crate`, crateId, res);
      return;
    }

    // condition: author cannot reply to own first bottle
    if (
      foundCrate.creator.user.toString() === user.id &&
      !foundCrate.responder.user
    ) {
      res.status(403)
        .json({
          errors: {
            crate: `To add another bottle to crate: '${crateId}', another user must join it first`
          }
        });
      return;
    }

    const crateResponder = {
      "responder.user": user.id,
      "responder.isAnonymous": !revealUsername
    };

    await Crate.findByIdAndUpdate(crateId, crateResponder);

    const createdBottle = await Bottle.create({
      author: user.id,
      crate: crateId,
      message,
    });

    res.status(201).json(createdBottle);
  } catch (err) {
    handleError(err, res, next);
  }
});

// ==========================================================
// ==========================================================
router.route(`/:id`, validateId)
  // get one crate
  .get(async (req, res, next) => {
    try {
      const { user } = req,
        crateId = req.params.id;

      const foundCrate = await Crate.findOne(
        {
          _id: crateId,
          $or: [{ "creator.user": user.id }, { "responder.user": user.id }],
        },
        { __v: 0 }
      )
        .populate({
          path: `creator.user`,
          select: [`_id`, `username`, `isAnonymous`]
        })
        .populate({
          path: `responder.user`,
          select: [`_id`, `username`, `isAnonymous`]
        });

      if (!foundCrate) {
        handleNotExist(`crate`, crateId, res);
        return;
      }

      const creatorId = foundCrate.creator.user.id,
        crateCreator = getCrateParticipant(foundCrate, user, "creator"),
        crateResponder = getCrateParticipant(foundCrate, user, "responder");

      foundCrate._doc.creator.user = crateCreator;
      foundCrate._doc.responder.user = crateResponder;

      const crateBottles = await Bottle.find(
        { crate: foundCrate.id },
        { crate: 0, __v: 0 }
      );

      for (let bottle of crateBottles) {
        if (bottle.author.equals(creatorId)) {
          bottle._doc.author = crateCreator;
        } else {
          bottle._doc.author = crateResponder;
        }
      }

      res.status(200).json({ ...foundCrate._doc, bottles: crateBottles });
    } catch (err) {
      handleError(err, res, next);
    }
  })
  // ==========================================================
  // abandon a crate
  .delete(async (req, res, next) => {
    try {
      const { user } = req,
        crateId = req.params.id;

      const foundCrate = await Crate.findOne(
        {
          _id: crateId,
          $or: [{ "creator.user": user.id }, { "responder.user": user.id }],
        },
        { __v: 0 }
      )
        .populate(`creator.user`)
        .populate(`responder.user`);

      if (!foundCrate) {
        handleNotExist(`crate`, crateId, res);
        return;
      }

      if (!foundCrate.isArchived && foundCrate.responder) {
        if (foundCrate.creator.user.toString() === user.id) {
          await Crate.findByIdAndUpdate(foundCrate.id, {
            "creator.user": null,
            isArchived: true,
          });
        } else {
          await Crate.findByIdAndUpdate(foundCrate.id, {
            "responder.user": null,
            isArchived: true,
          });
        }

        await Bottle.updateMany(
          { author: user.id, crate: crateID },
          { author: null });
      } else {
        await Crate.findByIdAndDelete(crateId);
        await Bottle.deleteMany({ crate: crateId });
      }

      res.sendStatus(204);
    } catch (err) {
      handleError(err, res, next);
    }
  });

// ==========================================================
// ==========================================================
// reserve spot on crate
router.patch(`/:id/reserve`, validateId, async (req, res, next) => {
  try {
    const { user } = req,
      crateId = req.params.id;

    const [foundCrate] = await Crate.findOne({
      _id: crateId,
      "responder.user": null,
      isArchived: false,
    });

    if (!foundCrate) {
      handleNotExist(`crate`, crateId, res);
      return;
    }

    await Crate.findByIdAndUpdate(crateId, { "responder.user": user.id });
    res.sendStatus(200);
  } catch (err) {
    handleError(err, res, next);
  }
});

// ==========================================================
// ==========================================================
// reveal username for one crate
router.patch(`/:id/reveal-username`, validateId, async (req, res, next) => {
  try {
    const { user } = req,
      crateId = req.params.id;

    const foundCrate = await Crate.findOne({
      _id: crateId,
      $or: [{ "creator.user": user.id }, { "responder.user": user.id }],
    })
      .populate(`creator.user`)
      .populate(`responder.user`);

    if (!foundCrate) {
      handleNotExist(`crate`, crateId, res);
      return;
    }

    if (foundCrate.isArchived) {
      res.status(400)
        .json({
          errors: {
            crate: `${crateId} is archived`
          }
        });
      return;
    }

    if (foundCrate.creator.user.toString() === user.id) {
      if (foundCrate.creator.isAnonymous) {
        await Crate.findByIdAndUpdate(crateId, {
          "creator.isAnonymous": false,
        });
      }
    } else {
      if (foundCrate.responder.isAnonymous) {
        await Crate.findByIdAndUpdate(crateId, {
          "responder.isAnonymous": false,
        });
      }
    }

    res.status(200)
      .json({ message: `You've successfully revealed your username!` });
  } catch (err) {
    handleError(err, res, next);
  }
});


module.exports = router;