const { handleNotExist, handleIsArchived } = require(`../utils/helpers.function`),
  validateId = require(`../middleware/id-validation.middleware`),
  router = require(`express`).Router(),
  Crate = require(`../models/crate.model`),
  Bottle = require(`../models/bottle.model`);


// ==========================================================
// auth
// ==========================================================
router.use(require(`../middleware/auth.middleware`));
router.use(require(`../middleware/access-restricting.middleware`));
// ==========================================================

// ==========================================================
// get all crates for current user
// ==========================================================
router.get(`/`, async (req, res, next) => {
  try {
    const { user } = req;

    const allCrates = await Crate.find(
      { $or: [{ "creator.user": user.id }, { "responder.user": user.id }] },
      { __v: 0 })
      .populate(`creator.user`)
      .populate(`responder.user`);

    const promises = [];

    allCrates.forEach(crate => {
      promises.push(Crate.structure(crate, user));
    });

    await Promise.all(promises);

    res.status(200).json(allCrates);
  } catch (err) {
    next(err);
  }
});
// ==========================================================

// ==========================================================
// get all bottle from one crate by crate's id
// ==========================================================
router.post(`/:id/bottles`, validateId, async (req, res, next) => {
  try {
    const { message, revealUsername } = req.body,
      { user } = req,
      crateId = req.params.id;

    const foundCrate = await Crate.findOne({
      _id: crateId,
      $or: [
        { "creator.user": user.id },
        { "responder.user": user.id },
        { "responder.user": null }
      ]
    });

    if (!foundCrate) {
      handleNotExist(`crate`, crateId, res);
      return;
    }

    if (foundCrate.isArchived) {
      handleIsArchived(crateId, res);
      return;
    }

    if (!foundCrate.responder.user) {
      // condition: author cannot reply to own first bottle
      if (foundCrate.creator.user.toString() === user.id) {
        res.status(403)
          .json({
            errors: {
              crate: `To add another bottle to crate: '${crateId}', another user must join it first`
            }
          });
        return;
      }

      await Crate.findByIdAndReserve(crateId, user.id, !revealUsername);
    }

    const createdBottle = await Bottle.create({
      author: user.id,
      crate: crateId,
      message,
    });
    delete createdBottle._doc.__v;

    res.status(201).json(createdBottle);
  } catch (err) {
    next(err);
  }
});
// ==========================================================

// ==========================================================
// ==========================================================
router.route(`/:id`)
  // ==========================================================
  // get one crate by id
  // ==========================================================
  .get(validateId, async (req, res, next) => {
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
        crateCreator = Crate.getParticipant(foundCrate, user, "creator"),
        crateResponder = Crate.getParticipant(foundCrate, user, "responder");

      foundCrate._doc.creator = crateCreator;
      foundCrate._doc.responder = crateResponder;

      const crateBottles = await Bottle.find(
        { crate: foundCrate.id },
        { crate: 0, __v: 0 }
      );

      for (let bottle of crateBottles) {
        if (bottle.author?.toString() === creatorId) {
          bottle._doc.author = crateCreator;
        } else {
          bottle._doc.author = crateResponder;
        }
      }

      res.status(200).json({ ...foundCrate._doc, bottles: crateBottles });
    } catch (err) {
      next(err);
    }
  })
  // ==========================================================

  // ==========================================================
  // abandon a crate by id
  // ==========================================================
  .delete(validateId, async (req, res, next) => {
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

      await Promise.all(Crate.abandon(foundCrate, user));

      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  });
// ==========================================================

// ==========================================================
// crate reservation
// ==========================================================
// reserve a crate

router.patch(`/:id/reserve`, validateId, async (req, res, next) => {
  try {
    const { user } = req,
      crateId = req.params.id;

    const bottlesCount = await Bottle.count({ crate: crateId });

    if (bottlesCount > 1) {
      res.status(403)
        .json({
          errors: {
            crate: `'${crateId}' has already been reserved`
          }
        });
    }

    const reservedCrate = await Crate.findByIdAndReserve(crateId, user.id);

    if (!reservedCrate) {
      res.status(404)
        .json({
          errors: {
            crate: `'${crateId}' is either not found. or cannot be reserved`
          }
        });
      return;
    }

    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
});

// ==========================================================
// cancel a reservation for one crate

router.delete(`/:id/reserve`, validateId, async (req, res, next) => {
  try {
    const { user } = req,
      crateId = req.params.id;

    await Crate.findByIdAndUnreserve(crateId, user.id);

    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
});
// ==========================================================

// ==========================================================
// reveal username for one crate
// ==========================================================
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
      handleIsArchived(crateId, res);
      return;
    }

    if (foundCrate.creator.user.id === user.id) {
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
      .json({ message: `You are no longer anonymous for crate ${crateId}!` });
  } catch (err) {
    next(err);
  }
});
// ==========================================================


module.exports = router;