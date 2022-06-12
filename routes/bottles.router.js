const router = require(`express`).Router();

router.route(`/`)
  .get(`/random`, async (req, res, next) => {
    /*
    request:
    req.headers.authorization[optional]: `Bearer asihfij0293urjpefm0pjfw0`
    */
  })
  .post(async (req, res, next) => {
    // condition: author cannot reply to own first bottle

    /*
    request:
    req.headers.authorization: `Bearer asihfij0293urjpefm0pjfw0`
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
    req.headers.authorization: `Bearer asihfij0293urjpefm0pjfw0`
    body: {
      message: string,
    }
    */
  })


module.exports = router;