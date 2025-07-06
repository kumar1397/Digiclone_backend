import User from "../models/User.js";
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary upload function for profile pictures
async function uploadProfilePictureToCloudinary(fileBuffer) {
  try {
    const options = {
      folder: 'profile-pictures',
      resource_type: "auto",
      quality: "auto",
    };

    // Convert buffer to base64 for direct upload
    const base64String = fileBuffer.toString('base64');
    const dataURI = `data:image/jpeg;base64,${base64String}`;

    console.log("Starting profile picture upload to Cloudinary...");
    console.log("File size:", fileBuffer.length, "bytes");
    
    // Shorter timeout for profile pictures (10 seconds)
    const result = await Promise.race([
      cloudinary.uploader.upload(dataURI, options),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Cloudinary upload timeout after 10 seconds')), 10000)
      )
    ]);
    
    console.log("Profile picture upload completed successfully");
    return result;
    
  } catch (error) {
    console.error("Error in Cloudinary profile picture upload:", error);
    throw error;
  }
}

export const getUser = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id);
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

export const updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, email, phone } = req.body;
    
    try {
        let updateData = { username, email, phone };
        
        // Handle profile picture upload if present
        if (req.file) {
            console.log("Profile picture upload detected:", req.file.originalname);
            console.log("Image file size:", req.file.size, "bytes");
            
            // Check file size (5MB limit for profile pictures)
            if (req.file.size > 5 * 1024 * 1024) {
                return res.status(400).json({
                    success: false,
                    message: "Profile picture too large. Maximum size is 5MB."
                });
            }
            
            try {
                const cloudinaryResult = await uploadProfilePictureToCloudinary(
                    req.file.buffer
                );
                console.log("Profile picture uploaded successfully:", cloudinaryResult.secure_url);
                updateData.profilePicture = cloudinaryResult.secure_url;
            } catch (error) {
                console.error("Error uploading profile picture:", error);
                return res.status(500).json({
                    success: false,
                    message: "Error uploading profile picture",
                    error: error.message
                });
            }
        }

        const user = await User.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: user
        });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
}

export const deleteUser = async (req, res) => {
    const { id } = req.params;
    
    try {
        const user = await User.findByIdAndDelete(id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        
        res.status(200).json({
            success: true,
            message: "User deleted successfully",
            data: user
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}