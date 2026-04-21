const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const db = require('./db');

// ── AUTH / USERS ───────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { email, name, age, password } = req.body;
  if (!email || !name || !password) return res.status(400).json({ error: 'Email, name and password required' });
  const [existing] = await db.query('SELECT Email FROM User WHERE Email = ?', [email]);
  if (existing.length) return res.status(409).json({ error: 'Email already registered' });
  const hash = await bcrypt.hash(password, 10);
  await db.query('INSERT INTO User (Email, Name, Age, Password_Hash) VALUES (?, ?, ?, ?)', [email, name, age || null, hash]);
  res.status(201).json({ email, name, age: age || null });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const [rows] = await db.query('SELECT * FROM User WHERE Email = ?', [email]);
  if (!rows.length) return res.status(401).json({ error: 'Invalid email or password' });
  const valid = await bcrypt.compare(password, rows[0].Password_Hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
  const { Password_Hash, ...user } = rows[0];
  res.json(user);
});

app.put('/api/users/:email', async (req, res) => {
  const { name, age } = req.body;
  await db.query('UPDATE User SET Name=?, Age=? WHERE Email=?', [name, age, req.params.email]);
  res.json({ message: 'Updated' });
});

// ── WORKOUTS ───────────────────────────────────────────────────────────────
app.get('/api/workouts/sessions', async (req, res) => {
  const [rows] = await db.query(
    `SELECT ws.*, wp.Program_Name FROM Workout_Session ws
     LEFT JOIN Workout_Program wp ON ws.Program_ID = wp.Program_ID
     WHERE ws.User_Email = ? ORDER BY ws.Workout_Date DESC`,
    [req.query.user]
  );
  res.json(rows);
});
app.get('/api/workouts/sessions/:id', async (req, res) => {
  const [session] = await db.query('SELECT * FROM Workout_Session WHERE Session_ID = ?', [req.params.id]);
  if (!session.length) return res.status(404).json({ error: 'Session not found' });
  const [sets] = await db.query(
    'SELECT * FROM Exercise_Set_Log WHERE Session_ID = ? ORDER BY Exercise_Name, Set_Number',
    [req.params.id]
  );
  res.json({ ...session[0], sets });
});
app.post('/api/workouts/sessions', async (req, res) => {
  const { workout_date, notes, user_email, program_id } = req.body;
  const [result] = await db.query(
    'INSERT INTO Workout_Session (Workout_Date, Notes, User_Email, Program_ID) VALUES (?, ?, ?, ?)',
    [workout_date, notes, user_email, program_id || null]
  );
  res.status(201).json({ session_id: result.insertId });
});
app.delete('/api/workouts/sessions/:id', async (req, res) => {
  await db.query('DELETE FROM Workout_Session WHERE Session_ID = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});
app.post('/api/workouts/sets', async (req, res) => {
  const { session_id, exercise_name, weight_lifted, weight_unit, reps, set_number } = req.body;
  const [result] = await db.query(
    'INSERT INTO Exercise_Set_Log (Session_ID, Exercise_Name, Weight_Lifted, Weight_Unit, Reps, Set_Number) VALUES (?, ?, ?, ?, ?, ?)',
    [session_id, exercise_name, weight_lifted, weight_unit || 'kg', reps, set_number]
  );
  res.status(201).json({ log_id: result.insertId });
});
app.delete('/api/workouts/sets/:id', async (req, res) => {
  await db.query('DELETE FROM Exercise_Set_Log WHERE Log_ID = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});
app.get('/api/workouts/programs', async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM Workout_Program WHERE Creator_Email = ? ORDER BY Program_ID DESC',
    [req.query.user]
  );
  res.json(rows);
});
app.post('/api/workouts/programs', async (req, res) => {
  const { program_name, duration, creator_email } = req.body;
  const [result] = await db.query(
    'INSERT INTO Workout_Program (Program_Name, Duration, Creator_Email) VALUES (?, ?, ?)',
    [program_name, duration, creator_email]
  );
  res.status(201).json({ program_id: result.insertId });
});

// ── NUTRITION ──────────────────────────────────────────────────────────────
app.get('/api/nutrition/meals', async (req, res) => {
  const [meals] = await db.query(
    'SELECT * FROM Meal WHERE User_Email = ? AND Meal_Date = ? ORDER BY Meal_ID',
    [req.query.user, req.query.date]
  );
  for (const meal of meals) {
    const [foods] = await db.query(
      `SELECT mf.*, f.Serving_Size, np.Calories, np.Protein, np.Carbs, np.Fat
       FROM Meal_Food mf JOIN Food f ON mf.Food_Name = f.Name
       LEFT JOIN Nutrient_Profile np ON f.Name = np.Food_Name
       WHERE mf.Meal_ID = ?`,
      [meal.Meal_ID]
    );
    meal.foods = foods;
  }
  res.json(meals);
});
app.get('/api/nutrition/calories', async (req, res) => {
  const [rows] = await db.query(
    `SELECT COALESCE(SUM(np.Calories * mf.Quantity), 0) AS total_calories,
            COALESCE(SUM(np.Protein  * mf.Quantity), 0) AS total_protein,
            COALESCE(SUM(np.Carbs   * mf.Quantity), 0) AS total_carbs,
            COALESCE(SUM(np.Fat     * mf.Quantity), 0) AS total_fat
     FROM Meal m JOIN Meal_Food mf ON m.Meal_ID = mf.Meal_ID
     JOIN Nutrient_Profile np ON mf.Food_Name = np.Food_Name
     WHERE m.User_Email = ? AND m.Meal_Date = ?`,
    [req.query.user, req.query.date]
  );
  res.json(rows[0]);
});
app.get('/api/nutrition/history', async (req, res) => {
  const [rows] = await db.query(
    `SELECT m.Meal_Date, COALESCE(SUM(np.Calories * mf.Quantity), 0) AS total_calories
     FROM Meal m JOIN Meal_Food mf ON m.Meal_ID = mf.Meal_ID
     JOIN Nutrient_Profile np ON mf.Food_Name = np.Food_Name
     WHERE m.User_Email = ? AND m.Meal_Date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
     GROUP BY m.Meal_Date ORDER BY m.Meal_Date ASC`,
    [req.query.user]
  );
  res.json(rows);
});
app.post('/api/nutrition/meals', async (req, res) => {
  const { meal_type, meal_date, user_email } = req.body;
  const [result] = await db.query(
    'INSERT INTO Meal (Meal_Type, Meal_Date, User_Email) VALUES (?, ?, ?)',
    [meal_type, meal_date, user_email]
  );
  res.status(201).json({ meal_id: result.insertId });
});
app.post('/api/nutrition/meals/:meal_id/foods', async (req, res) => {
  const { food_name, quantity, quantity_unit } = req.body;
  await db.query(
    'INSERT INTO Meal_Food (Meal_ID, Food_Name, Quantity, Quantity_Unit) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE Quantity=?, Quantity_Unit=?',
    [req.params.meal_id, food_name, quantity, quantity_unit || 'serving', quantity, quantity_unit || 'serving']
  );
  res.status(201).json({ message: 'Added' });
});
app.delete('/api/nutrition/meals/:meal_id/foods/:food_name', async (req, res) => {
  await db.query('DELETE FROM Meal_Food WHERE Meal_ID = ? AND Food_Name = ?',
    [req.params.meal_id, req.params.food_name]);
  res.json({ message: 'Removed' });
});
app.delete('/api/nutrition/meals/:id', async (req, res) => {
  await db.query('DELETE FROM Meal WHERE Meal_ID = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ── HYDRATION ──────────────────────────────────────────────────────────────
app.get('/api/hydration', async (req, res) => {
  let query = 'SELECT * FROM Hydration_Log WHERE User_Email = ?';
  const params = [req.query.user];
  if (req.query.date) { query += ' AND Date = ?'; params.push(req.query.date); }
  query += ' ORDER BY Date DESC';
  const [rows] = await db.query(query, params);
  res.json(rows);
});
app.get('/api/hydration/today', async (req, res) => {
  const [rows] = await db.query(
    'SELECT COALESCE(SUM(Water_L), 0) AS total_water FROM Hydration_Log WHERE User_Email = ? AND Date = ?',
    [req.query.user, req.query.date || new Date().toISOString().split('T')[0]]
  );
  res.json(rows[0]);
});
app.get('/api/hydration/history', async (req, res) => {
  const [rows] = await db.query(
    `SELECT Date, SUM(Water_L) AS total_water FROM Hydration_Log
     WHERE User_Email = ? AND Date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
     GROUP BY Date ORDER BY Date ASC`,
    [req.query.user]
  );
  res.json(rows);
});
app.post('/api/hydration', async (req, res) => {
  const { water_l, date, user_email } = req.body;
  const [result] = await db.query(
    'INSERT INTO Hydration_Log (Water_L, Date, User_Email) VALUES (?, ?, ?)',
    [water_l, date, user_email]
  );
  res.status(201).json({ hydration_id: result.insertId });
});
app.delete('/api/hydration/:id', async (req, res) => {
  await db.query('DELETE FROM Hydration_Log WHERE Hydration_ID = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ── BODY METRICS ───────────────────────────────────────────────────────────
app.get('/api/body', async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM Body_Metric WHERE User_Email = ? ORDER BY Date DESC LIMIT 30',
    [req.query.user]
  );
  res.json(rows);
});
app.post('/api/body', async (req, res) => {
  const { current_weight, current_fat_percentage, date, user_email } = req.body;
  const [result] = await db.query(
    'INSERT INTO Body_Metric (Current_Weight, Current_Fat_Percentage, Date, User_Email) VALUES (?, ?, ?, ?)',
    [current_weight, current_fat_percentage, date, user_email]
  );
  res.status(201).json({ body_metric_id: result.insertId });
});
app.delete('/api/body/:id', async (req, res) => {
  await db.query('DELETE FROM Body_Metric WHERE Body_Metric_ID = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ── GOALS ──────────────────────────────────────────────────────────────────
app.get('/api/goals', async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM Goal WHERE User_Email = ? ORDER BY Created_At DESC',
    [req.query.user]
  );
  res.json(rows);
});
app.post('/api/goals', async (req, res) => {
  const { target_calories, target_weight, target_fat_percentage, target_date, user_email } = req.body;
  const [result] = await db.query(
    'INSERT INTO Goal (Target_Calories, Target_Weight, Target_Fat_Percentage, Target_Date, User_Email, Created_At) VALUES (?, ?, ?, ?, ?, CURDATE())',
    [target_calories, target_weight, target_fat_percentage, target_date, user_email]
  );
  res.status(201).json({ goal_id: result.insertId });
});
app.put('/api/goals/:id/status', async (req, res) => {
  await db.query('UPDATE Goal SET Status = ? WHERE Goal_ID = ?', [req.body.status, req.params.id]);
  res.json({ message: 'Updated' });
});
app.delete('/api/goals/:id', async (req, res) => {
  await db.query('DELETE FROM Goal WHERE Goal_ID = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

// ── EXERCISES ──────────────────────────────────────────────────────────────
app.get('/api/exercises', async (req, res) => {
  let query = 'SELECT * FROM Exercise_Library';
  const params = [];
  if (req.query.q) { query += ' WHERE Exercise_Name LIKE ? OR Muscle_Groups LIKE ?'; params.push(`%${req.query.q}%`, `%${req.query.q}%`); }
  query += ' ORDER BY Exercise_Name';
  const [rows] = await db.query(query, params);
  res.json(rows);
});
app.post('/api/exercises', async (req, res) => {
  const { exercise_name, muscle_groups, exercise_type, equipment, exercise_information } = req.body;
  await db.query(
    'INSERT INTO Exercise_Library (Exercise_Name, Muscle_Groups, Exercise_Type, Equipment, Exercise_Information) VALUES (?, ?, ?, ?, ?)',
    [exercise_name, muscle_groups, exercise_type, equipment, exercise_information]
  );
  res.status(201).json({ name: exercise_name });
});

// ── FOODS ──────────────────────────────────────────────────────────────────
app.get('/api/foods', async (req, res) => {
  let query = `SELECT f.*, np.Calories, np.Protein, np.Carbs, np.Fat
               FROM Food f LEFT JOIN Nutrient_Profile np ON f.Name = np.Food_Name`;
  const params = [];
  if (req.query.q) { query += ' WHERE f.Name LIKE ?'; params.push(`%${req.query.q}%`); }
  query += ' ORDER BY f.Name';
  const [rows] = await db.query(query, params);
  res.json(rows);
});
app.post('/api/foods', async (req, res) => {
  const { name, serving_size, calories, protein, carbs, fat } = req.body;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('INSERT INTO Food (Name, Serving_Size) VALUES (?, ?)', [name, serving_size]);
    await conn.query(
      'INSERT INTO Nutrient_Profile (Food_Name, Calories, Protein, Carbs, Fat) VALUES (?, ?, ?, ?, ?)',
      [name, calories, protein, carbs, fat]
    );
    await conn.commit();
    res.status(201).json({ name });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

// ── DASHBOARD ──────────────────────────────────────────────────────────────
app.get('/api/dashboard', async (req, res) => {
  const { user, date } = req.query;
  const today = date || new Date().toISOString().split('T')[0];

  const [[calories]] = await db.query(
    `SELECT COALESCE(SUM(np.Calories * mf.Quantity), 0) AS total_calories,
            COALESCE(SUM(np.Protein  * mf.Quantity), 0) AS total_protein,
            COALESCE(SUM(np.Carbs   * mf.Quantity), 0) AS total_carbs,
            COALESCE(SUM(np.Fat     * mf.Quantity), 0) AS total_fat
     FROM Meal m JOIN Meal_Food mf ON m.Meal_ID = mf.Meal_ID
     JOIN Nutrient_Profile np ON mf.Food_Name = np.Food_Name
     WHERE m.User_Email = ? AND m.Meal_Date = ?`,
    [user, today]
  );
  const [[hydration]] = await db.query(
    'SELECT COALESCE(SUM(Water_L), 0) AS total_water FROM Hydration_Log WHERE User_Email = ? AND Date = ?',
    [user, today]
  );
  const [[latestBody]] = await db.query(
    'SELECT * FROM Body_Metric WHERE User_Email = ? ORDER BY Date DESC LIMIT 1',
    [user]
  );
  const [[sessionCount]] = await db.query(
    'SELECT COUNT(*) AS count FROM Workout_Session WHERE User_Email = ? AND Workout_Date = ?',
    [user, today]
  );
  const [activeGoals] = await db.query(
    'SELECT * FROM Goal WHERE User_Email = ? AND Status = "active" ORDER BY Created_At DESC',
    [user]
  );
  const [recentSessions] = await db.query(
    `SELECT ws.*, wp.Program_Name,
       (SELECT COUNT(*) FROM Exercise_Set_Log WHERE Session_ID = ws.Session_ID) AS set_count
     FROM Workout_Session ws LEFT JOIN Workout_Program wp ON ws.Program_ID = wp.Program_ID
     WHERE ws.User_Email = ? ORDER BY ws.Workout_Date DESC LIMIT 5`,
    [user]
  );

  res.json({
    date: today, calories, hydration,
    latest_body: latestBody || null,
    workout_today: sessionCount.count > 0,
    active_goals: activeGoals,
    recent_sessions: recentSessions,
  });
});

// ── CATCH-ALL ──────────────────────────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`FitTrack server running at http://localhost:${PORT}`));
