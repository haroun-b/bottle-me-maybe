const { handleError } = require(`../utils/helpers.function`);
const router = require(`express`).Router();
const Crate = require(`../models/crate.model`);
const Bottle = require(`../models/bottle.model`);


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
  } catch (error) {
    handleError(error);
  }
});

// ==========================================================
// ==========================================================
router.post(`/:id/bottles`, async (req, res, next) => {
  // condition: author cannot reply to own first bottle
  try {
    const { user } = req;
    const crateId = req.params.id;
    const { message, revealUsername } = req.body;

    if (!mongoose.isValidObjectId(crateId)) {
      res.status(400)
        .json({
          errors: [{
            path: `id`,
            message: `${crateId} is not a valid crate id.`
          }]
        });
      return;
    }

    const foundCrate = await Crate.findById(crateId);

    if (!foundCrate) {
      res.status(404)
        .json({
          errors: [{
            path: `crate`,
            message: `Crate: ${crateId} does not exist.`
          }]
        });
      return;
    }

    if (
      foundCrate.creator.user.toString() === user.id &&
      !foundCrate.responder.user
    ) {
      res.status(403)
        .json({
          errors: [{
            path: `crate`,
            message: `To add another bottle to crate: ${crateId}, another user must join it first.`
          }]
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
  } catch (error) {
    handleError(error);
  }
});

// ==========================================================
// ==========================================================
router.route(`/:id`)
  // get one crate
  .get(async (req, res, next) => {
    try {
      const { user } = req; req.id
      const crateId = req.params.id;
      const foundCrate = await Crate.findOne({
        _id: crateId,
        $or: [{ "creator.user": user.id }, { "responder.user": user.id }],
      })
        .populate(`creator.user`)
        .populate(`responder.user`);

      if (!foundCrate) {
        res.status(404)
          .json({
            errors: [{
              path: `crate`,
              message: `Crate: ${crateId} does not exist.`
            }]
          });
        return;
      }

      const creatorId = foundCrate.creator.user.id;
      const crateCreator = getCrateParticipant(foundCrate, user, "creator");
      const crateResponder = getCrateParticipant(foundCrate, user, "responder");

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
    } catch (error) {
      handleError(error);
    }
  })
// ==========================================================
  // abandon a crate
  .delete(async (req, res, next) => {
    try {
      const { user } = req;
      const foundCrate = await Crate.findOne(
        {
          _id: req.params.id,
          $or: [{ "creator.user": user.id }, { "responder.user": user.id }],
        },
        { __v: 0 }
      )
        .populate(`creator.user`)
        .populate(`responder.user`);

      if (!foundCrate) {
        res
          .status(404)
          .json({ message: `No such crate with id: ${req.params.id}.` });
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

        await Bottle.updateMany({ author: user.id }, { author: null });
      } else {
        await Crate.findByIdAndDelete(foundCrate.id);
        await Bottle.deleteMany({ crate: foundCrate.id });
      }

      res
        .status(204)
        .json({ message: `Crate: ${req.params.id} successfully abondened.` });
    } catch (error) {
      next(error);
    }
  });

// ==========================================================
// ==========================================================
// reserve spot on crate
router.patch(`/:id/reserve`, async (req, res, next) => {
  try {
    const { user } = req;
    const [foundCrate] = await Crate.findOne({
      _id: req.params.id,
      "responder.user": null,
      isArchived: false,
    });

    if (!foundCrate) {
      res
        .status(404)
        .json({ message: `No such crate with id: ${req.params.id}.` });
    }

    await Crate.findByIdAndUpdate(foundCrate.id, { "responder.user": user.id });
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

// ==========================================================
// ==========================================================
// reveal username for one crate
router.patch(`/:id/reveal-username`, async (req, res, next) => {
  try {
    const { user } = req;
    const foundCrate = await Crate.findOne({
      _id: req.params.id,
      $or: [{ "creator.user": user.id }, { "responder.user": user.id }],
    })
      .populate(`creator.user`)
      .populate(`responder.user`);

    if (!foundCrate) {
      res
        .status(404)
        .json({ message: `No such crate with id: ${req.params.id}.` });
    }

    if (foundCrate.isArchived) {
      res.status(400).json({ message: `This Crate is archived` });
      return;
    }

    if (foundCrate.creator.user.toString() === user.id) {
      if (foundCrate.creator.isAnonymous) {
        await Crate.findByIdAndUpdate(foundCrate.id, {
          "creator.isAnonymous": false,
        });
      }
    } else {
      if (foundCrate.responder.isAnonymous) {
        await Crate.findByIdAndUpdate(foundCrate.id, {
          "responder.isAnonymous": false,
        });
      }
    }

    res
      .status(200)
      .json({ message: `You've successfully revealed your username.` });
  } catch (error) {
    next(error);
  }
});

function getCrateParticipant(crate, user, participant) {
  let result = {};

  if (!crate[participant].user) {
    result = null;
  } else if (
    crate[participant].isAnonymous &&
    crate[participant].user.id !== user.id
  ) {
    result.user = `Anonymous`;
    result.isAnonymous = true;
  } else {
    result.user = crate[participant].user.username;
    result.isAnonymous = crate[participant].isAnonymous;
  }
  
  return result;
}

async function structureCrate(crate, user) {
  const [latestBottle] = await Bottle.find(
    { crate: crate.id },
    { author: 1, message: 1, _id: 0 },
    { sort: { createdAt: -1 }, limit: 1 }
  );

  const crateCreator = getCrateParticipant(crate, user, `creator`);
  const crateResponder = getCrateParticipant(crate, user, `responder`);

  latestBottle._doc.author =
    latestBottle.author.equals(crate.creator.user.id)
      ? crateCreator
      : crateResponder;
  
  crate._doc.creator = crateCreator;
  crate._doc.responder = crateResponder;
  crate._doc.latestBottle = latestBottle;
}


module.exports = router;