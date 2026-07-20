const db = require("../config/db");

// READ - Get All Experiences
exports.getAllExperiences = async (req, res) => {
  const userId = req.session.user ? req.session.user.id : 1;
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    let query = `
            SELECT e.*, u.username 
            FROM experiences e 
            INNER JOIN users u ON e.user_id = u.id 
            WHERE e.user_id = ?
        `;
    let queryParams = [userId];

    if (search) {
      query += ` AND (e.title LIKE ? OR e.company_name LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    let countQuery = query.replace("e.*, u.username", "COUNT(*) as total");
    const [totalRowsResult] = await db.query(countQuery, queryParams);
    const totalRows = totalRowsResult[0].total;
    const totalPages = Math.ceil(totalRows / limit);

    query += ` ORDER BY e.start_date DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    const [experiences] = await db.query(query, queryParams);

    res.render("experiences/index", {
      experiences,
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
  res.render("experiences/create");
};

// STORE - Process Insert
exports.storeExperience = async (req, res) => {
  const userId = req.session.user ? req.session.user.id : 1;
  const {
    title,
    company_name,
    location,
    start_date,
    end_date,
    is_current,
    description,
  } = req.body;
  const currentFlag = is_current ? 1 : 0;
  const finalEndDate = currentFlag ? null : end_date || null;

  try {
    await db.query(
      "INSERT INTO experiences (user_id, title, company_name, location, start_date, end_date, is_current, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        userId,
        title,
        company_name,
        location || null,
        start_date,
        finalEndDate,
        currentFlag,
        description || null,
      ],
    );
    res.redirect(
      "/experiences?success=Experience timeline record deployed successfully.",
    );
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// EDIT - Render Form
exports.renderEditForm = async (req, res) => {
  try {
    const [experience] = await db.query(
      "SELECT * FROM experiences WHERE id = ?",
      [req.params.id],
    );
    if (experience.length === 0) return res.status(404).send("Asset Not Found");
    res.render("experiences/edit", { experience: experience[0] });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// UPDATE - Process Update
exports.updateExperience = async (req, res) => {
  const {
    title,
    company_name,
    location,
    start_date,
    end_date,
    is_current,
    description,
  } = req.body;
  const currentFlag = is_current ? 1 : 0;
  const finalEndDate = currentFlag ? null : end_date || null;

  try {
    await db.query(
      "UPDATE experiences SET title = ?, company_name = ?, location = ?, start_date = ?, end_date = ?, is_current = ?, description = ? WHERE id = ?",
      [
        title,
        company_name,
        location,
        start_date,
        finalEndDate,
        currentFlag,
        description,
        req.params.id,
      ],
    );
    res.redirect("/experiences?success=Experience parameters reconfigured.");
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// DELETE - Process Purge
exports.deleteExperience = async (req, res) => {
  try {
    await db.query("DELETE FROM experiences WHERE id = ?", [req.params.id]);
    res.redirect(
      "/experiences?success=Experience record wiped from production pipelines.",
    );
  } catch (err) {
    res.status(500).send(err.message);
  }
};
