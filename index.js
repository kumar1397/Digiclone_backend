import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import user from "./routes/user.js";
import bodyParser from "body-parser";
import dbConnect from "./config/database.js";
import conversation from "./routes/conversation.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;


// Use CORS middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(express.json());

// Connect to the database
dbConnect();

// Cloudinary configuration

// Parse URL-encoded data
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// Import and mount routes
app.use("/", user);
app.use("/conversation", conversation);

// Start the Express server
app.listen(PORT, () => {
  console.log(`Express server started at port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("<h1>Hello</h1>");
});