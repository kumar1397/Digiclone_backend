// controllers/userController.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import dotenv from "dotenv";
import cors from "cors";
import express from "express";

dotenv.config();
const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

export const signup = async (req, res) => {
  try {
    console.log('Signup attempt with data:', { ...req.body, password: '[REDACTED]' });
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      console.log('Missing required fields:', { name: !!name, email: !!email, password: !!password });
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Invalid email format:', email);
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Check if user with the given email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("User already exists with email:", email);
      return res.status(422).json({
        success: false,
        message: "User already exists",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Create a new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
    });
    console.log('New user object created');

    // Save the user to the database
    await user.save();
    console.log('User saved to database successfully');

    return res.status(201).json({
      success: true,
      message: "User registered successfully. Please sign in to continue.",
    });
  } catch (error) {
    console.error('Signup error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(400).json({
      success: false,
      message: `User cannot be registered: ${error.message}`,
    });
  }
};

export const signin = async (req, res) => {
  try {
    console.log('Signin attempt with email:', req.body.email);
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({
        success: false,
        message: "Please fill up all the required fields",
      });
    }

    const user = await User.findOne({ email });
    console.log('User lookup result:', user ? 'User found' : 'User not found');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User is not registered with us. Please sign up to continue",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('Password validation result:', isPasswordValid);

    if (isPasswordValid) {
      const token = jwt.sign(
        { email: user.email, id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
      );
      console.log('JWT token generated successfully');

      user.token = token;
      user.password = undefined;

      const options = {
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        httpOnly: true,
      };

      console.log('Sending successful login response');
      res.cookie("token", token, options).status(200).json({
        success: true,
        token,
        user,
        message: "User login success",
      });
    } else {
      console.log('Invalid password attempt');
      return res.status(401).json({
        success: false,
        message: "Password is incorrect",
      });
    }
  } catch (error) {
    console.error('Signin error:', error);
    return res.status(500).json({
      success: false,
      message: "Login failure. Please try again",
    });
  }
};
