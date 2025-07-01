import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import user from "./routes/user.js";
import bodyParser from "body-parser";
import dbConnect from "./config/database.js";
import conversation from "./routes/conversation.js";
import clone from "./routes/clone.js";
import fileupload from "./routes/fileupload.js";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

console.log("Starting server setup...");

// Use CORS middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json());

console.log("Connecting to database...");
dbConnect();

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// Import and mount routes
console.log("Registering routes...");
app.use("/", user);
app.use("/", conversation);
app.use("/clone", clone);
app.use("/", fileupload);
console.log("Routes registered successfully");

// Start the Express server
app.listen(PORT, () => {
  console.log(`Express server started at port ${PORT}`);
  console.log(`Test the clone route at: http://localhost:${PORT}/clone/test`);
});

app.get("/", (req, res) => {
  res.send("<h1>Hello</h1>");
});

// Add a catch-all route for debugging
app.use("*", (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: "Route not found", 
    method: req.method, 
    url: req.originalUrl 
  });
});