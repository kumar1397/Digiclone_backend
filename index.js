import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import user from "./routes/user.js";
import bodyParser from "body-parser";
import dbConnect from "./config/database.js";
import conversation from "./routes/conversation.js";
import clone from "./routes/clone.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;
// Use CORS middleware
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
}));

app.use(express.json());

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// ✅ Mount routes
app.use("/", user);
app.use("/", conversation);
app.use("/clone", clone);

// Connect to database and start server
dbConnect();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
