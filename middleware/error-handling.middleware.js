const router = require(`express`).Router();

router.use((req, res, next) => {
  // runs whenever the requested resource is not found
  res.status(404)
    .json({
      errors: {
        resource: `Requested resource not found`
      }
    });
});

router.use((err, req, res, next) => {
  console.error("ERROR", req.method, req.path, err);

  // only renders if the error occurred before sending the response
  if (!res.headersSent) {
    res.status(404)
      .json({
        errors: {
          server: `Internal server error`
        }
      });
  }
});


module.exports = router;