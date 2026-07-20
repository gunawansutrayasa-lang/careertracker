module.exports = (req, res, next) => {
  if (req.session && req.session.user) {
    // Suntikkan data user aktif ke EJS secara global
    res.locals.currentUser = req.session.user;
    next();
  } else {
    res.redirect(
      "/login?error=Access Denied. Secure credentials encryption required.",
    );
  }
};
