const db = require("../config/db");

// READ - Get All Projects with Search, Filter, Sort, Pagination
exports.getAllProjects = async (req, res) => {
  const userId = req.session.user ? req.session.user.id : 1; // Locked to dummy user
  try {
    // 1. Parsing Query Params from URL
    const search = req.query.search || "";
    const category = req.query.category || "";
    const status = req.query.status || "";
    const sortBy = req.query.sortBy || "p.created_at";
    const order = req.query.order === "ASC" ? "ASC" : "DESC";

    const page = parseInt(req.query.page) || 1;
    const limit = 5; // Standard SaaS view row limit
    const offset = (page - 1) * limit;

    // 2. Base Query Construction (INNER JOIN requirement met)
    let query = `
            SELECT p.*, u.username 
            FROM projects p 
            INNER JOIN users u ON p.user_id = u.id 
            WHERE p.user_id = ?
        `;
    let queryParams = [userId];

    // 3. Conditional Filtering (LIKE & IN / Equality)
    if (search) {
      query += ` AND p.project_name LIKE ?`;
      queryParams.push(`%${search}%`);
    }
    if (category) {
      query += ` AND p.category = ?`;
      queryParams.push(category);
    }
    if (status) {
      query += ` AND p.status = ?`;
      queryParams.push(status);
    }

    // Count Total rows for Pagination math Before appending LIMIT/OFFSET
    let countQuery = query.replace("p.*, u.username", "COUNT(*) as total");
    const [totalRowsResult] = await db.query(countQuery, queryParams);
    const totalRows = totalRowsResult[0].total;
    const totalPages = Math.ceil(totalRows / limit);

    // 4. Sorting & Pagination Syntax (ORDER BY, LIMIT, OFFSET requirements met)
    query += ` ORDER BY ${sortBy} ${order} LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    // Execute finalized analytical data query
    const [projects] = await db.query(query, queryParams);

    res.render("projects/index", {
      projects,
      search,
      category,
      status,
      sortBy,
      order,
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
  res.render("projects/create");
};

// STORE - Process Form Input with Server Validation
exports.storeProject = async (req, res) => {
  const userId = req.session.user ? req.session.user.id : 1;
  const { project_name, category, status, start_date, end_date, description } =
    req.body;

  // Strict Validation (No empty fields allowed)
  if (!project_name || !category || !status || !start_date || !end_date) {
    return res.redirect(
      "/projects/new?error=All mandatory validation fields must be populated.",
    );
  }

  try {
    // INSERT requirement met
    await db.query(
      "INSERT INTO projects (user_id, project_name, category, status, start_date, end_date, description) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        userId,
        project_name,
        category,
        status,
        start_date,
        end_date,
        description || null,
      ],
    );
    res.redirect("/projects?success=Project deployment mapped successfully.");
  } catch (err) {
    res.redirect(`/projects/new?error=${encodeURIComponent(err.message)}`);
  }
};

// EDIT - Render Form
exports.renderEditForm = async (req, res) => {
  try {
    const [project] = await db.query("SELECT * FROM projects WHERE id = ?", [
      req.params.id,
    ]);
    if (project.length === 0)
      return res.status(404).send("Target Asset Not Found");
    res.render("projects/edit", { project: project[0] });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// UPDATE - Process modification
exports.updateProject = async (req, res) => {
  const { project_name, category, status, start_date, end_date, description } =
    req.body;
  try {
    // UPDATE requirement met
    await db.query(
      "UPDATE projects SET project_name = ?, category = ?, status = ?, start_date = ?, end_date = ?, description = ? WHERE id = ?",
      [
        project_name,
        category,
        status,
        start_date,
        end_date,
        description,
        req.params.id,
      ],
    );
    res.redirect("/projects?success=Project parameters updated.");
  } catch (err) {
    res.redirect(
      `/projects/${req.params.id}/edit?error=${encodeURIComponent(err.message)}`,
    );
  }
};

// DELETE - Purge data row
exports.deleteProject = async (req, res) => {
  try {
    // DELETE requirement met
    await db.query("DELETE FROM projects WHERE id = ?", [req.params.id]);
    res.redirect(
      "/projects?success=Project execution purged from core storage.",
    );
  } catch (err) {
    res.redirect(`/projects?error=${encodeURIComponent(err.message)}`);
  }
};
