const router = require(`express`).Router();


router.get(`/`, (req, res, next) => {
  try {
    res.status(200).json({
      message: `Welcome to your own private island where the only way to communicate is through http bottles 😁`,
      apiGithubRepo: `https://github.com/haroun-b/bottle-me-maybe`
    });
  } catch (err) {
    next(err);
  }
});


module.exports = router;