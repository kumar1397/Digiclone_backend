import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePicture: {
      type: String,
      default: "",
    },
    clone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CloneProfile',
      required: false
    } 
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
