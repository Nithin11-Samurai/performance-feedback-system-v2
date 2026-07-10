/**
 * Wraps an async Express route handler so rejected promises are forwarded
 * to next(err) automatically, instead of every controller needing its own
 * try/catch block.
 *
 * Usage:
 *   router.get('/', asyncHandler(async (req, res) => { ... }));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
