const router = require(`express`).Router();

// get all the crates
router.get(`/`, async (req, res, next) => {

})

router.route(`/:id`)
  // get one crate
  .get(async (req, res, next) => {

  })
  // add a bottle to a crate
  .post(async (req, res, next) => {

  })
  // abandon a crate; reveal username for one crate
  .patch(async (req, res, next) => {

  })


module.exports = router;