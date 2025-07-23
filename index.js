import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import user from "./routes/user.js";
import bodyParser from "body-parser";
import dbConnect from "./config/database.js";
import conversation from "./routes/conversation.js";
import clone from "./routes/clone.js";
import fileupload from "./routes/fileupload.js";

import session from "express-session";
import passport from "passport";
import "./config/passport.js"; // ⬅️ Load strategy
import googleAuthRoutes from "./routes/googleAuth.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

// ✅ Session middleware (MUST be before passport)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));

// ✅ Initialize passport
app.use(passport.initialize());
app.use(passport.session());

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
app.use("/", fileupload);
app.use("/", googleAuthRoutes); // ⬅️ Google auth routes

// Root
app.get("/", (req, res) => {
  res.send("<h1>Hello</h1>");
});

// Connect to database and start server
dbConnect();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
