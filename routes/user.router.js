const router = require(`express`).Router();

router.post(`/signup`, async (req, res, next) => {
  /*
    request:
    body: {
      username: string,
      password: string,
      email[optional]: string,
      crateId[optional]: string,  // included with signup and reply requests
    }
  */

  /*
  response: jwt
  */
})

router.post(`/login`, async (req, res, next) => {
  /*
    request:
    body: {
      username: string,
      password: string,
      crateId[optional]: string,  // included with login and reply requests
    }
  */

  /*
  response: jwt
  */
})

// reset link structure: `/user/:id/?token=asihfij0293urjpefm0pjfw0`
router.route(`/user/:id`)
  // reset password
  .patch(async (req, res, next) => {
    /*
      request:
      req.query.token: `asihfij0293urjpefm0pjfw0`
      body: {
      password: string,
    }
    */
  })
  .delete(async (req, res, next) => {
    /*
      request:
      req.headers.authorization: `Bearer asihfij0293urjpefm0pjfw0`
    */
  })

module.exports = router;