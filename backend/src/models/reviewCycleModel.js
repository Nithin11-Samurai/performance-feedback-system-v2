/**
 * Review cycle model — all SQL for the `review_cycles` table.
 */
const { query } = require('../config/db');

async function list({ status } = {}) {
  const conditions = [];
  const values = [];
  if (status) {
    conditions.push(`status = $${values.length + 1}`);
    values.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(`SELECT * FROM review_cycles ${where} ORDER BY start_date DESC`, values);
  return result.rows;
}

async function findById(id) {
  const result = await query('SELECT * FROM review_cycles WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function create({ name, startDate, endDate, createdBy }) {
  const result = await query(
    `INSERT INTO review_cycles (name, start_date, end_date, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, startDate, endDate, createdBy]
  );
  return result.rows[0];
}

async function update(id, fields) {
  const allowed = ['name', 'start_date', 'end_date', 'status'];
  const setClauses = [];
  const values = [];
  let idx = 1;

  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key)) {
      setClauses.push(`${key} = $${idx}`);
      values.push(value);
      idx += 1;
    }
  }
  if (setClauses.length === 0) return findById(id);

  values.push(id);
  const result = await query(
    `UPDATE review_cycles SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

async function remove(id) {
  const result = await query('DELETE FROM review_cycles WHERE id = $1 RETURNING id', [id]);
  return result.rows.length > 0;
}

module.exports = { list, findById, create, update, remove };
