const { handleError, isValidId, handleInvalidId } = require(`../utils/helpers.function`);


function validateId(req, res, next) {
  try {
    const {id} = req.params;

    if (!isValidId(id)) {
      handleInvalidId(id, res);
      return;
    }

    next();
  } catch (err) {
    handleError(err, res, next);
  }
}


module.exports = validateId;