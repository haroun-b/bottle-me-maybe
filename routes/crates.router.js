const router = require(`express`).Router();
const Crate = require(`../models/crate.model`);
const Bottle = require(`../models/bottle.model`);
const { create, findByIdAndUpdate } = require("../models/crate.model");

router.use(require(`../middleware/auth.middleware`));
router.use(require(`../middleware/access-restricting.middleware`));
// get all the crates
router.get(`/`, async (req, res, next) => {
  /*
  request:
  req.user: {
    id,
    username
  }
  */
  // from db fetch all crates where: user.id === crate.creator.user || user.id === crate.responder.user

  try {
    const { user } = req;
    const allCrates = await Crate.find(
      { $or: [{ "creator.user": user.id }, { "responder.user": user.id }] },
      { __v: 0 }
    )
      .populate(`creator.user`)
      .populate(`responder.user`);
    console.log(allCrates);

    for (let crate of allCrates) {
      await structureCrate(crate, user);
    }

    res.status(200).json(allCrates);
  } catch (error) {
    next(error);
  }
});

router
  .route(`/:id`)
  // get one crate
  .get(async (req, res, next) => {
    /*
    request:
    req.params.id = crateId
    req.user: {
      id,
      username
    }
    */

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

      const creatorId = foundCrate.creator.user.id;
      const crateCreator = getCrateParticipant(foundCrate, user, "creator");
      const crateResponder = getCrateParticipant(foundCrate, user, "responder");

      const crateBottles = await Bottle.find(
        { crate: foundCrate.id },
        { crate: 0, __v: 0 }
      );

      for (let bottle of crateBottles) {
        console.log(bottle.author.toString(), user.id);

        if (bottle.author.equals(creatorId)) {
          bottle._doc.author = crateCreator;
        } else {
          bottle._doc.author = crateResponder;
        }
      }

      res.status(200).json({ ...foundCrate._doc, bottles: crateBottles });
    } catch (error) {
      next(error);
    }
  })
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

  const crateCreator = getCrateParticipant(crate, user, "creator");
  const crateResponder = getCrateParticipant(crate, user, "responder");

  latestBottle._doc.author =
    latestBottle.author.toString() === crate.creator.user.id
      ? crateCreator
      : crateResponder;

  crate = crate._doc;
  crate.creator = crateCreator;
  crate.responder = crateResponder;
  crate.latestBottle = latestBottle;
}

module.exports = router;
