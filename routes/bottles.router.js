const router = require(`express`).Router();
const mongoose = require("mongoose");
const Bottle = require(`../models/bottle.model`);
const Crate = require(`../models/crate.model`);
const User = require(`../models/user.model`);



router.use(require(`../middleware/auth.middleware`));

router.get(`/random`, async (req, res, next) => {
  try {
    const query = { "responder.id": null, isArchived: false };
    
    // users shouldn't get their own bottles
    const {user} = req;
    if (user) {
      query["creator.id"] = { $ne: user.id };
    }

    const floatingCrates = await Crate.find(query, { _id: 1, creator: 1 });

    if (!floatingCrates.length) {
      res.status(200).json([]);
      return;
    }


    const randomIndex = Math.floor(Math.random() * floatingCrates.length),
      randomCrate = floatingCrates[randomIndex],
      randomBottle = await Bottle.findOne({ crate: randomCrate._id }),
      bottleAuthor = `Anonymous`;

    if (!randomCrate.creator.isAnonymous) {
      bottleAuthor = await User.findById(randomBottle.author, { username: 1 });
    }

    randomBottle.author = bottleAuthor;
    res.status(200).json(randomBottle);
  } catch (error) {
    next(error);
  }
})

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
      const creator = { id: user.id };
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
      if (foundCrate.creator.id.toString() === user.id && !foundCrate.responder.id) {
        res.status(403).json({ message: `Cannot reply until this bottle is picked by another user` });
        return;
      }

      crate = foundCrate;
    } else {
      // error invalid crateId
      res.status(400).json({ message: `${crateId} is not a valid crate id.` });
      return;
    }

    const createdBottle = await Bottle.create({
      author: user.id,
      crate: crate._id,
      message: message
    });

    res.status(201).json(createdBottle);

  } catch (error) {
    next(error);
  }
})
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
      res.status(404).json({ message: `No such bottle with id: ${req.params.id}.` });
      return;
    }

    const { crate } = foundBottle;

    if (crate.responder.id || crate.isArchived) {
      //  not possible to update a bottle that is part of a conversation
      res.status(403).json({ message: `Cannot update the bottle with id: ${req.params.id}, because it is part of a conversation.` });
      return;
    }

    const { message } = req.body;
    const updatedMessage = await Bottle.findByIdAndUpdate(req.params.id, { message }, { new: true });

    res.status(200).json(updatedMessage);

  } catch (error) {
    next(error);
  }
})


module.exports = router;