/**
 * middleware/authorize.js
 *
 * Role-based access control middleware.
 * Use after the `protect` middleware so that req.user is always populated.
 *
 * Usage in routes:
 *   router.get('/', protect, authorize('admin'), handler)
 *   router.get('/', protect, authorize('admin', 'superadmin'), handler)
 */

const ErrorResponse = require("../utils/errorResponse");

/**
 * @param {...string} roles - One or more roles that are permitted
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse("Not authenticated", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Access denied: role "${req.user.role}" is not authorized to access this resource`,
          403,
        ),
      );
    }

    next();
  };
};

module.exports = authorize;
