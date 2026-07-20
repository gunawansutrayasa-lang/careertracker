const db = require("../config/db");

// READ - Get All Achievements
exports.getAllAchievements = async (req, res) => {
  const userId = req.session.user ? req.session.user.id : 1;
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    let query = `
            SELECT a.*, u.username 
            FROM achievements a 
            INNER JOIN users u ON a.user_id = u.id 
            WHERE a.user_id = ?
        `;
    let queryParams = [userId];

    if (search) {
      query += ` AND (a.title LIKE ? OR a.issuer LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    let countQuery = query.replace("a.*, u.username", "COUNT(*) as total");
    const [totalRowsResult] = await db.query(countQuery, queryParams);
    const totalRows = totalRowsResult[0].total;
    const totalPages = Math.ceil(totalRows / limit);

    query += ` ORDER BY a.date_awarded DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    const [achievements] = await db.query(query, queryParams);

    res.render("achievements/index", {
      achievements,
      search,
      page,
      totalPages,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    res.status(500).send("Database Pipeline Fault: " + err.message);
  }
};

// CREATE - Render Form
exports.renderCreateForm = (req, res) => {
  res.render("achievements/create");
};

// STORE - Process Insert
exports.storeAchievement = async (req, res) => {
  const userId = req.session.user ? req.session.user.id : 1;
  const { title, issuer, date_awarded, description } = req.body;

  try {
    await db.query(
      "INSERT INTO achievements (user_id, title, issuer, date_awarded, description) VALUES (?, ?, ?, ?, ?)",
      [userId, title, issuer, date_awarded, description || null],
    );
    res.redirect(
      "/achievements?success=Achievement node deployed successfully.",
    );
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// EDIT - Render Form
exports.renderEditForm = async (req, res) => {
  try {
    const [achievement] = await db.query(
      "SELECT * FROM achievements WHERE id = ?",
      [req.params.id],
    );
    if (achievement.length === 0)
      return res.status(404).send("Asset Not Found");
    res.render("achievements/edit", { achievement: achievement[0] });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// UPDATE - Process Update
exports.updateAchievement = async (req, res) => {
  const { title, issuer, date_awarded, description } = req.body;

  try {
    await db.query(
      "UPDATE achievements SET title = ?, issuer = ?, date_awarded = ?, description = ? WHERE id = ?",
      [title, issuer, date_awarded, description, req.params.id],
    );
    res.redirect("/achievements?success=Achievement parameters reconfigured.");
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// DELETE - Process Purge
exports.deleteAchievement = async (req, res) => {
  try {
    await db.query("DELETE FROM achievements WHERE id = ?", [req.params.id]);
    res.redirect(
      "/achievements?success=Achievement record wiped from production pipelines.",
    );
  } catch (err) {
    res.status(500).send(err.message);
  }
};
