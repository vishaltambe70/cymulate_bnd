// Import dependencies
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// Create an instance of Express app
const app = express();
const port = process.env.PORT || 3001;

// Set up the PostgreSQL connection
const pool = new Pool({
  user: "postgres",
  password: "root",
  host: "localhost",
  database: "cymulate",
  port: 5432, // or the port where your PostgreSQL is running
});

pool
  .connect()
  .then(() => console.log("Connected to database"))
  .catch((error) => console.error(error));

// Middleware
app.use(express.json());
const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:3001", "*"],
};
app.use(cors());

// Define routes

// Route to fetch all records
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Failed to fetch records from the database" });
  }
});

app.get("/emailstatus", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM emailstatus");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Failed to fetch records from the database" });
  }
});

app.post("/users", async (req, res) => {
  const { username, password, email, firstname, lastname, phone } = req.body;
  console.log("test", req.body);
  try {
    const query =
      "INSERT INTO users (username, password, email, firstname, lastname, phone) VALUES ($1, $2, $3, $4, $5, $6)";
    const values = [username, password, email, firstname, lastname, phone];
    await pool.query(query, values);
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create user in the database" });
  }
});

// API endpoint for storing email status
app.post("/emailstatus", async (req, res) => {
  const { userId, email, emailBody, status } = req.body;

  try {
    // Insert email status data into the database
    const query =
      "INSERT INTO emailstatus (user_id, email, body, status) VALUES ($1, $2, $3, $4)";
    const values = [userId, email, emailBody, status];
    await pool.query(query, values);

    // Send success response
    res.status(201).json({ message: "Email status stored successfully" });
  } catch (error) {
    console.error(error);
    // Send error response
    res
      .status(500)
      .json({ error: "Failed to store email status in the database" });
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "email@mail.com",
      pass: "12345",
    },
  });

  const mailOptions = {
    from: "email@mail.com",
    to: email,
    subject: "test",
    text: emailBody,
  };

  try {
    // Send the email using Nodemailer
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", mailOptions);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const query = `
      SELECT * FROM users WHERE email = $1
    `;
    const values = [email];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isPasswordMatch = password === result.rows[0].password ? true : false;

    if (!isPasswordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const userId = result.rows[0].id;
    const token = jwt.sign(
      { userId: result.rows[0].id, email: result.rows[0].email },
      "1234567",
      { expiresIn: "1h" }
    );

    // Send response with JWT token
    res.json({ token, userId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to sign in" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
