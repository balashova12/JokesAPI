import express from "express";
import pg from "pg";
import env from "dotenv";

const app = express();
app.use(express.json());
env.config();

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

// Get Random Joke
app.get('/jokes/random', async (req, res) => {
  try {
    const result = await db.query('SELECT jokes.*, categories.name AS category FROM jokes JOIN categories ON jokes.category_id = categories.id ORDER BY RANDOM() LIMIT 1');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Random Joke from Category
app.get('/jokes/random/:category', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT jokes.*, categories.name AS category FROM jokes JOIN categories ON jokes.category_id = categories.id WHERE categories.name = $1 ORDER BY RANDOM() LIMIT 1',
      [req.params.category]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Categories
app.get('/categories', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categories');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Jokes in a Category
app.get('/jokes/:category', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT jokes.*, categories.name AS category FROM jokes JOIN categories ON jokes.category_id = categories.id WHERE categories.name = $1',
      [req.params.category]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Joke by ID
app.get('/jokes/id/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT jokes.*, categories.name AS category FROM jokes JOIN categories ON jokes.category_id = categories.id WHERE jokes.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Joke not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add New Category
app.post('/categories', async (req, res) => {
  const { name } = req.body;
  try {
    const result = await db.query('INSERT INTO categories (name) VALUES ($1) RETURNING *', [name]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add New Joke
app.post('/jokes', async (req, res) => {
  const { category, joke_text } = req.body;
  try {
    const categoryResult = await db.query('SELECT id FROM categories WHERE name = $1', [category]);
    if (categoryResult.rows.length === 0) {
      return res.status(400).json({ error: 'Category not found' });
    }

    const category_id = categoryResult.rows[0].id;

    const result = await db.query(
      'INSERT INTO jokes (joke_text, category_id) VALUES ($1, $2) RETURNING *',
      [joke_text, category_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Existing Joke to Category
app.post('/jokes/:id/category/:categoryId', async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE jokes SET category_id = $1 WHERE id = $2 RETURNING *',
      [req.params.categoryId, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Vote on a Joke
app.post('/jokes/:id/vote', async (req, res) => {
  const { vote } = req.body; // "like" or "dislike"
  try {
    if (vote === "like") {
      await db.query('UPDATE jokes SET likes = likes + 1 WHERE id = $1', [req.params.id]);
    } else if (vote === "dislike") {
      await db.query('UPDATE jokes SET dislikes = dislikes + 1 WHERE id = $1', [req.params.id]);
    } else {
      return res.status(400).json({ error: "Invalid vote type" });
    }
    const result = await db.query('SELECT * FROM jokes WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
