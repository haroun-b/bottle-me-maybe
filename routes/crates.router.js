const router = require(`express`).Router();

// get all the crates
router.get(`/`, async (req, res, next) => {
  /*
  request:
  req.headers.authorization: `Bearer asihfij0293urjpefm0pjfw0`
  */
})

router.route(`/:id`)
  // get one crate
  .get(async (req, res, next) => {
    /*
    request:
    req.params.id = crateId
    req.headers.authorization: `Bearer asihfij0293urjpefm0pjfw0`
    */
  })
  // reveal username for one crate
  .patch(async (req, res, next) => {
    /*
    request:
    req.params.id = crateId
    req.headers.authorization: `Bearer asihfij0293urjpefm0pjfw0`
    */
  })
  // abandon a crate
  .delete(async (req, res, next) => {
    /*
    request:
    req.headers.authorization: `Bearer asihfij0293urjpefm0pjfw0`
    req.params.id = crateId
    */

    // if isArchived === false && partyTwo === null:
    // delete crate and related bottle
    // else if isArchived === false && partyTwo !== null:
    // update: crate.party* = null ; whichever party is equal to req.user.id
    // update: bottle.authorId = null; where bottle.crateId === crateId && bottle.authorId === user.id
    // else do nothing
  })


module.exports = router;