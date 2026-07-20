const db = require("../config/db");

// READ - Get All Skills
exports.getAllSkills = async (req, res) => {
  const userId = req.session.user ? req.session.user.id : 1;
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    let query = `
            SELECT s.*, u.username 
            FROM skills s 
            INNER JOIN users u ON s.user_id = u.id 
            WHERE s.user_id = ?
        `;
    let queryParams = [userId];

    if (search) {
      query += ` AND (s.name LIKE ? OR s.category LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    let countQuery = query.replace("s.*, u.username", "COUNT(*) as total");
    const [totalRowsResult] = await db.query(countQuery, queryParams);
    const totalRows = totalRowsResult[0].total;
    const totalPages = Math.ceil(totalRows / limit);

    query += ` ORDER BY s.category ASC, s.name ASC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    const [skills] = await db.query(query, queryParams);

    res.render("skills/index", {
      skills,
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
  res.render("skills/create");
};

// STORE - Process Insert
exports.storeSkill = async (req, res) => {
  const userId = req.session.user ? req.session.user.id : 1;
  const { name, category, proficiency_level } = req.body;

  try {
    await db.query(
      "INSERT INTO skills (user_id, name, category, proficiency_level) VALUES (?, ?, ?, ?)",
      [userId, name, category, proficiency_level],
    );
    res.redirect(
      "/skills?success=Skill asset registered successfully into cluster stack.",
    );
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// EDIT - Render Form
exports.renderEditForm = async (req, res) => {
  try {
    const [skill] = await db.query("SELECT * FROM skills WHERE id = ?", [
      req.params.id,
    ]);
    if (skill.length === 0) return res.status(404).send("Asset Not Found");
    res.render("skills/edit", { skill: skill[0] });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// UPDATE - Process Update
exports.updateSkill = async (req, res) => {
  const { name, category, proficiency_level } = req.body;

  try {
    await db.query(
      "UPDATE skills SET name = ?, category = ?, proficiency_level = ? WHERE id = ?",
      [name, category, proficiency_level, req.params.id],
    );
    res.redirect("/skills?success=Skill telemetry adjusted.");
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// DELETE - Process Purge
exports.deleteSkill = async (req, res) => {
  try {
    await db.query("DELETE FROM skills WHERE id = ?", [req.params.id]);
    res.redirect(
      "/skills?success=Skill wiped from infrastructure configuration.",
    );
  } catch (err) {
    res.status(500).send(err.message);
  }
};
