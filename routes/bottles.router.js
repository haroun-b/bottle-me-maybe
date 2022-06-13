const router = require(`express`).Router();
const Bottle = require("../models/bottle.model");

router.use(`../middleware/auth.middleware`);

router.route(`/`)
  .get(`/random`, async (req, res, next) => {
    /*
    request:
    req.user: {
      id,
      username
    }
    */
    if (req.user) {
      await Bottle.findOneAndUpdate({ latestFetch: { time: Date.now() - 30000} })
    }
  })
  .post(async (req, res, next) => {
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
  .patch(`/:id`, async (req, res, next) => {
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