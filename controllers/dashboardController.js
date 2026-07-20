const db = require("../config/db");

exports.getDashboard = async (req, res) => {
  const userId = req.session.user ? req.session.user.id : 1; // Mengunci ke user dummy id 1 demi kesederhanaan UAS

  try {
    // 1. QUERY AGREGASI DENGAN COUNT (Syarat Ujian)
    const [projectsCount] = await db.query(
      "SELECT COUNT(*) as total FROM projects WHERE user_id = ?",
      [userId],
    );
    const [orgsCount] = await db.query(
      "SELECT COUNT(*) as total FROM organizations WHERE user_id = ?",
      [userId],
    );
    const [achievementsCount] = await db.query(
      "SELECT COUNT(*) as total FROM achievements WHERE user_id = ?",
      [userId],
    );
    const [certsCount] = await db.query(
      "SELECT COUNT(*) as total FROM certificates WHERE user_id = ?",
      [userId],
    );
    const [skillsCount] = await db.query(
      "SELECT COUNT(*) as total FROM skills WHERE user_id = ?",
      [userId],
    );
    const [expsCount] = await db.query(
      "SELECT COUNT(*) as total FROM experiences WHERE user_id = ?",
      [userId],
    );

    // 2. QUERY DENGAN GROUP BY & HAVING (Syarat Mutlak Ujian)
    // Menghitung jumlah projek per kategori yang memiliki lebih dari 0 projek
    const [projectStats] = await db.query(
      "SELECT category, COUNT(*) as count FROM projects WHERE user_id = ? GROUP BY category HAVING count > 0",
      [userId],
    );

    // 3. QUERY DENGAN INNER JOIN (Syarat Ujian: Minimal Join users dengan projects)
    const [latestProjects] = await db.query(
      "SELECT p.*, u.username FROM projects p INNER JOIN users u ON p.user_id = u.id WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT 3",
      [userId],
    );

    // Kirim data ke View EJS
    res.render("dashboard", {
      stats: {
        projects: projectsCount[0].total,
        organizations: orgsCount[0].total,
        achievements: achievementsCount[0].total,
        certificates: certsCount[0].total,
        skills: skillsCount[0].total,
        experiences: expsCount[0].total,
      },
      projectStats,
      latestProjects,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Database Error pada Dashboard: " + error.message);
  }
};
