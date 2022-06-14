const router = require(`express`).Router();
const Bottle = require(`../models/bottle.model`);
const Crate = require(`../models/crate.model`);
const User = require(`../models/user.model`);


router.get(`/random`, async (req, res, next) => {
  /*
  request:
  req.user: {
    id,
    username
  }
  */
  try {
    const floatingCrates = await Crate.find({ "responder._id": null, isArchived: false }, { _id: 1, creator: 1 }),
      randomIndex = Math.floor(Math.random() * floatingCrates.length),
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

router.use(require(`../middleware/auth.middleware`));
router.post(``, async (req, res, next) => {
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
    const { body, user } = req;
    let crate;

    if (!body.crateId) {
      crate = await Crate.insertOne({
        isArchived: false,
        creator: {
          id: user.id,
          isAnonymous: body.revealUsername
        }
      });
    } else if (mongoose.isValidObjectId(crateId)) {
      // check that crate exists
      const foundCrate = await Crate.findById(crateId);

      if (foundCrate) {
        crate = foundCrate;
      }
    } else {
      // error invalid crateId
    }

    const createdBottle = await Bottle.insertOne({
      author: user.id,
      crate: crate._id,
      message: body.message
    });

    res.status(201).json(createdBottle);

    // otherwise we create a new crate and a new bottle with the crateId inside
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
    const foundBottle = await Bottle.findById(req.params.id).populate(`responder`);

    if (!foundBottle) {
      // 404
    }
    if (foundBottle.responder.id) {
      //  not possible to update a bottle that is part of a conversation
    }

    const updatedMessage = await Bottle.findByIdAndUpdate(req.params.id, { message }, {new: true});

    res.status(200).json(updatedMessage);

  } catch (error) {
    next(error);
  }
})


module.exports = router;