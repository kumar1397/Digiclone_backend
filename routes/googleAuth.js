import express from "express";
import passport from "passport";

const router = express.Router();

router.get("/auth/google", passport.authenticate("google", {
  scope: ["profile", "email"],
}));

router.get("/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
  }),
  (req, res) => {
    res.redirect(`${process.env.FRONTEND_URL}/home`);
  }
);

router.get("/auth/logout", (req, res) => {
  req.logout(err => {
    if (err) {
      return res.status(500).send("Logout failed");
    }

    req.session.destroy(() => {
      res.clearCookie("connect.sid"); // Important for clearing the cookie
      res.redirect(process.env.FRONTEND_URL || "http://localhost:3000");
    });
  });
});

export default router;
