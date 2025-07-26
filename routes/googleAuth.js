import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
const router = express.Router();

function generateJWT(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" } // You can change duration as needed
  );
}

router.get("/auth/google", passport.authenticate("google", {
  scope: ["profile", "email"],
}));

router.get("/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login`,
  }),
  (req, res) => {
    const user = req.user;
    const token = generateJWT(user); // You need to define this

    const html = `
      <html>
        <body>
          <script>
            window.opener.postMessage(
              {
                token: "${token}",
                userId: "${user._id}",
                name: "${user.name}",
                email: "${user.email}"
              },
              "${process.env.FRONTEND_URL}"
            );
            window.close();
          </script>
        </body>
      </html>
    `;

    res.send(html);
  }
);


router.get("/auth/logout", (req, res) => {
  req.logout(err => {
    if (err) {
      return res.status(500).send("Logout failed");
    }

    req.session.destroy(() => {
      res.clearCookie("connect.sid"); // Important for clearing the cookie
    });
  });
});

export default router;
