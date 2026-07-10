/**
 * Managed lookup lists for department and job title (Item 3). Backs the
 * dropdowns admins use when creating/editing employees, instead of free
 * text. `users.department`/`users.job_title` stay plain strings — these
 * tables are just the curated source list.
 */
const { query } = require('../config/db');

async function listDepartments() {
  const result = await query('SELECT * FROM departments ORDER BY name');
  return result.rows;
}

async function createDepartment(name, createdBy) {
  const result = await query(
    'INSERT INTO departments (name, created_by) VALUES ($1, $2) RETURNING *',
    [name, createdBy]
  );
  return result.rows[0];
}

async function deleteDepartment(id) {
  const result = await query('DELETE FROM departments WHERE id = $1 RETURNING id', [id]);
  return result.rows.length > 0;
}

async function listJobTitles() {
  const result = await query('SELECT * FROM job_titles ORDER BY title');
  return result.rows;
}

async function createJobTitle(title, createdBy) {
  const result = await query(
    'INSERT INTO job_titles (title, created_by) VALUES ($1, $2) RETURNING *',
    [title, createdBy]
  );
  return result.rows[0];
}

async function deleteJobTitle(id) {
  const result = await query('DELETE FROM job_titles WHERE id = $1 RETURNING id', [id]);
  return result.rows.length > 0;
}

module.exports = {
  listDepartments,
  createDepartment,
  deleteDepartment,
  listJobTitles,
  createJobTitle,
  deleteJobTitle,
};
