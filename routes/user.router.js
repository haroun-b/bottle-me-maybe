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

  // reset password
router.patch(`/reset-password`, async (req, res, next) => {
    /*
      request:
      req.query.token: `asihfij0293urjpefm0pjfw0`
      body: {
      password: string,
    }
    */
  })
router.delete(async (req, res, next) => {
    /*
      request:
      req.headers.authorization: `Bearer asihfij0293urjpefm0pjfw0`
    */
  })

module.exports = router;