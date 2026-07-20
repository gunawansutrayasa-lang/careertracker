// middlewares/adminMiddleware.js

function isAdmin(req, res, next) {
  // 1. Cek apakah user sudah login (apakah data session user ada)
  if (!req.session || !req.session.user) {
    return res.redirect("/login"); // Jika belum login, tendang ke halaman login
  }

  // 2. Cek apakah role pengguna adalah ADMIN
  if (req.session.user.role === "ADMIN") {
    return next(); // Jika ADMIN, ijinkan akses ke halaman berikutnya
  }

  // 3. Jika bukan ADMIN (berarti USER biasa), blokir total dengan status 403 Forbidden
  res.status(403).send(`
        <div style="text-align: center; margin-top: 100px; font-family: sans-serif;">
            <h1 style="font-size: 50px; color: #dc3545;">403 - Access Denied</h1>
            <p style="font-size: 18px; color: #6c757d;">Maaf, halaman Maintenance ini hanya dapat diakses oleh Administrator Database.</p>
            <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 5px;">Kembali ke Dashboard</a>
        </div>
    `);
}

module.exports = { isAdmin };
