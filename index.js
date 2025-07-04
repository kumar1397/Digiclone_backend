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


// Use CORS middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json());



app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// Import and mount routes

app.use("/", user);
app.use("/", conversation);
app.use("/clone", clone);
app.use("/", fileupload);
// Start the Express server

app.get("/", (req, res) => {
  res.send("<h1>Hello</h1>");
});

// Add a catch-all route for debugging

// Connect to database before starting server
dbConnect();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
