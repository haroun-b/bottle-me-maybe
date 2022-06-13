const router = require(`express`).Router();
const Bottle = require(`../models/bottle.model`);
const Crate = require(`../models/crate.model`);
const User = require(`../models/user.model`);

router.use(require(`../middleware/auth.middleware`));


router.get(`/random`, async (req, res, next) => {
    /*
    request:
    req.user: {
      id,
      username
    }
    */
    try {
      const currentTime = Date.now();

      const floatingCrates = await Crate.find({ "responder._id": null, isArchived: false }, { _id: 1, creator: 1 }),
        randomIndex = Math.floor(Math.random() * floatingCrates.length),
        randomCrate = floatingCrates[randomIndex],
        randomBottle = await Bottle.findOne({ crate: randomCrate._id }),
        bottleAuthor = `Anonymous`;

        if (!randomCrate.creator.isAnonymous) {
          bottleAuthor = await User.findById(randomBottle.authorId, {username: 1});
        }

        randomBottle.author = bottleAuthor;
        res.status(200).json(randomBottle);      
    } catch (error) {
      next(error);
    }
  })
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
  })


module.exports = router;