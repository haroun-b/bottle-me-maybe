async function restrictAccess(req, res, next) {
  try {
    if (!req.user) {
      res.status(401).json({ message: `Please signup or login.` });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}


module.exports = restrictAccess;