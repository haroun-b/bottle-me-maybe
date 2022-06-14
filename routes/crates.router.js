const router = require(`express`).Router();
const Crate = require(`../models/crate.model`);


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
    const allCrates =
      await Crate
        .find({ $or: [{ "creator.user": user.id }, { "responder.user": user.id }] })
        .populate(`creator.user`)
        .populate(`responder.user`);

    allCrates.forEach(crate => {
      crate = crate._doc;

      if (!crate.creator.user) {
        crate.creator = null;
      } else if (crate.creator.isAnonymous && crate.creator.user.id !== user.id) {
        crate.creator = `Anonymous`
      } else {
        crate.creator = crate.creator.user.username;
      }

      if (!crate.responder.user) {
        crate.responder = null;
      } else if (crate.responder.isAnonymous && crate.responder.user.id !== user.id) {
        crate.responder = `Anonymous`
      } else {
        crate.responder = crate.responder.user.username;
      }
    });

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
    // from db fetch crate where: req.params.id === crate.id
    // if user.id === crate.creator.user, remove creator; else remove responder
    // for whichever party is left: if isAnonymous === true, change party(left) to be party(left): `Anonymous`, otherwise party(left): `username`
    // send crate back to user
  })
  // reveal username for one crate; or reserve spot on crate
  .patch(async (req, res, next) => {
    /*
    request:
    req.params.id = crateId
    req.user: {
      id,
      username
    }
    */

    // from where: req.params.id === crate.id

    // update crate.responder.user: user.id; and crate.responder.isAnonymous: false;

    // from db fetch crate where: req.params.id === crate.id
    const foundCrate = await fetchCrate(req.params.id, req.user);

    // if user.id === crate.creator.user, remove creator; else remove responder
    // for whichever party is left: if isAnonymous === true, change party(left) to be party(left): `Anonymous`, otherwise party(left): `username`

    // send crate back to user
  })
  // abandon a crate
  .delete(async (req, res, next) => {
    /*
    request:
    req.user: {
      id,
      username
    }
    req.params.id = crateId
    */
    // if isArchived === false && responder === null:
    // delete crate and related bottle
    // else if isArchived === false && responder !== null:
    // update: crate.party* = null ; whichever party is equal to req.user.id
    // update: bottle.authorId = null; where bottle.crateId === crateId && bottle.authorId === user.id
    // else do nothing
  });

async function fetchCrate(crateId, user) {
  // from db fetch crate where: crateId === crate.id
  // if user.id === crate.creator.user, remove creator; else remove responder
  // for whichever party is left: if isAnonymous === true, change party(left) to be party(left): `Anonymous`, otherwise party(left): `username`
  // send crate back to user
}

module.exports = router;
