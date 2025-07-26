import CloneProfile from '../models/Clone.js';
import User from '../models/User.js';
import cloudinary from 'cloudinary';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import mongoose from 'mongoose';
import File from '../models/FileUpload.js';

// Function to generate custom clone_id
function generateCloneId() {    
  const random = Math.random().toString(16).substr(2, 12);
  return `clone_u_${random}`;
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadtoCloudinary(fileBuffer, folder, quality) {
  console.log("In uploadCloudinary!!");
  try {
    const options = {
      folder,
      resource_type: "auto",
      quality: quality || "auto",
    };

    // Convert buffer to base64 for direct upload
    const base64String = fileBuffer.toString('base64');
    const dataURI = `data:image/jpeg;base64,${base64String}`;

    console.log("Starting direct upload to Cloudinary...");
    console.log("File size:", fileBuffer.length, "bytes");
    console.log("Base64 length:", base64String.length);

    // Shorter timeout for smaller files (15 seconds)
    const result = await Promise.race([
      cloudinary.uploader.upload(dataURI, options),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Cloudinary upload timeout after 15 seconds')), 15000)
      )
    ]);

    console.log("Cloudinary upload completed successfully");
    return result;

  } catch (error) {
    console.error("Error in Cloudinary upload function:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      status: error.http_code,
      name: error.name
    });
    throw error;
  }
}

async function uploadPDFs(uploadedFiles, cloneId) {
  try {
    const savedFiles = await Promise.all(uploadedFiles.map(async file => {
      console.log("Processing PDF file:", file.originalname);

      // Check if it's a PDF
      if (file.mimetype !== 'application/pdf') {
        console.log("Skipping non-PDF file:", file.originalname);
        return null;
      }

      // Upload to GridFS manually since we're using memory storage
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: 'pdfs',
      });

      const uploadStream = bucket.openUploadStream(
        `${Date.now()}-${file.originalname}`,
        {
          metadata: {
            originalName: file.originalname,
            mimeType: file.mimetype,
            uploadDate: new Date(),
          }
        }
      );

      // Create a promise to handle the upload
      const uploadPromise = new Promise((resolve, reject) => {
        uploadStream.on('finish', (fileInfo) => {
          resolve(fileInfo);
        });
        uploadStream.on('error', reject);
      });

      // Write the file buffer to the upload stream
      uploadStream.end(file.buffer);

      // Wait for upload to complete
      const fileInfo = await uploadPromise;
      console.log("PDF uploaded to GridFS with id:", fileInfo._id);

      // Save metadata to File collection
      const metadata = new File({
        cloneId: cloneId, // Use clone_id string instead of ObjectId
        fileId: fileInfo._id,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadDate: new Date(),
      });

      await metadata.save();

      return {
        fileId: fileInfo._id,
        originalName: file.originalname,
        link: `${process.env.BACKEND_URL}/clone/file/${fileInfo._id}`,
      };
    }));

    // Filter out null values (non-PDF files)
    const validFiles = savedFiles.filter(file => file !== null);
    return validFiles;
  } catch (error) {
    console.error('Error in uploadPDFs:', error);
    throw error;
  }
};

// Configure multer for handling FormData - Memory storage for clone creation
const uploadForClone = multer({
  storage: multer.memoryStorage(), // Accepts all file types (images and PDFs)
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit per file
    fieldSize: 10 * 1024 * 1024, // 10MB limit for field values
    files: 20, // Maximum 20 files
    fields: 100, // Maximum 100 fields
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types for now
    cb(null, true);
  }
});

// GridFS storage for PDF-only uploads (if needed separately)
const storage = new GridFsStorage({
  url: process.env.DATABASE_URL,
  options: { useNewUrlParser: true, useUnifiedTopology: true },
  file: (req, file) => {
    if (file.mimetype !== 'application/pdf') {
      return null;
    }
    return {
      filename: `${Date.now()}-${file.originalname}`,
      bucketName: 'pdfs',
    };
  },
});

const uploadForPDFs = multer({ storage });

export const createClone = async (req, res) => {
  try {
    // Extract form fields
    const cloneName = req.body.cloneName;
    const tone = JSON.parse(req.body.tone || '[]');
    const style = JSON.parse(req.body.style || '[]');
    const values = JSON.parse(req.body.values || '[]');
    const catchphrases = req.body.catchphrases;
    const dos = req.body.dos;
    const donts = req.body.donts;
    const description = req.body.description;
    const youtubeLinks = JSON.parse(req.body.youtubeLinks || '[]');
    const otherLinks = JSON.parse(req.body.otherLinks || '[]');

    // Validate required fields
    if (!cloneName || !tone || !style || !values || !youtubeLinks || !otherLinks) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: cloneName, tone, style, values, youtubeLinks, and otherLinks are required"
      });
    }

    // Create Clone object
    const newClone = new CloneProfile({
      clone_id: generateCloneId(),
      clone_name: cloneName,
      tone,
      style,
      image: 'default-avatar.png',
      catchphrases: Array.isArray(catchphrases) ? catchphrases : catchphrases ? [catchphrases] : [],
      values: Array.isArray(values) ? values : values ? [values] : [],
      dos,
      donts,
      freeform_description: description,
      youtubeLinkUpload: Array.isArray(youtubeLinks) ? youtubeLinks : [youtubeLinks],
      otherLinkUpload: Array.isArray(otherLinks) ? otherLinks : [otherLinks],
    });

    const savedClone = await newClone.save();

    // Link user with clone if userId provided
    if (req.body.userId) {
      try {
        await User.findByIdAndUpdate(req.body.userId, {
          cloneId: savedClone.clone_id
        });
      } catch (error) {
        console.error("Error linking clone to user:", error);
      }
    }

    // Handle clone image upload
    const imageFile = req.files?.find(file => file.fieldname === 'cloneImage');
    if (imageFile && imageFile.size <= 5 * 1024 * 1024) {
      try {
        const cloudinaryResult = await uploadtoCloudinary(
          imageFile.buffer,
          'clone-images',
          'auto'
        );
        savedClone.image = cloudinaryResult.secure_url;
        await savedClone.save();
      } catch (error) {
        console.error("Error uploading clone image:", error);
      }
    }

    // Handle PDF file uploads
    let uploadedFiles = [];
    const pdfFiles = req.files?.filter(file => file.fieldname === 'uploadedFiles') || [];
    if (pdfFiles.length > 0) {
      try {
        uploadedFiles = await uploadPDFs(pdfFiles, savedClone.clone_id);
        if (uploadedFiles.length > 0) {
          savedClone.fileUploads = uploadedFiles.map(file => file.fileId);
          await savedClone.save();
        }
      } catch (error) {
        console.error("Error uploading files:", error);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Clone created successfully',
      data: {
        cloneId: savedClone._id,
        clone_id: savedClone.clone_id,
        cloneName: savedClone.clone_name,
        tone: savedClone.tone,
        style: savedClone.style,
        values: savedClone.values,
        catchphrases: savedClone.catchphrases,
        dos: savedClone.dos,
        donts: savedClone.donts,
        description: savedClone.freeform_description,
        image: savedClone.image,
        fileUploads: uploadedFiles,
        youtubeLinkUpload: savedClone.youtubeLinkUpload,
        otherLinkUpload: savedClone.otherLinkUpload,
      }
    });

  } catch (error) {
    console.error("Error creating clone:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating clone",
      error: error.message
    });
  }
};

export const updateClone = async (req, res) => {
  const { clone_id } = req.params;

  try {
    const { tone, style, catchphrases, dos, donts, freeform_description } = req.body;

    // Basic validation
    if (!clone_id) {
      return res.status(400).json({ success: false, message: "Missing clone_id" });
    }

    // Optional: validate data types
    if (
      !Array.isArray(tone) ||
      !Array.isArray(style) ||
      !Array.isArray(catchphrases)
    ) {
      return res.status(400).json({
        success: false,
        message: "tone, style, and catchphrases must be arrays",
      });
    }

    // Find and update the clone
    const updatedClone = await CloneProfile.findOneAndUpdate(
      { clone_id },
      {
        tone,
        style,
        catchphrases,
        dos,
        donts,
        freeform_description,
      },
      { new: true }
    );

    if (!updatedClone) {
      return res.status(404).json({ success: false, message: "Clone not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Clone personality updated successfully",
      data: updatedClone,
    });

  } catch (error) {
    console.error("Error updating clone personality:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update clone personality",
      error: error.message,
    });
  }
};

export const getAllClones = async (req, res) => {
  try {
    // Fetch all clones with populated fileUploads and linkUpload
    const clones = await CloneProfile.find({})
      .populate('fileUploads', 'originalName fileSize uploadDate')
      .sort({ createdAt: -1 }); // Sort by newest first

    return res.status(200).json({
      success: true,
      message: 'Clones fetched successfully',
      count: clones.length,
      data: clones
    });

  } catch (error) {
    console.error("Error fetching clones:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching clones",
      error: error.message
    });
  }
};

export const getClonebyId = async (req, res) => {
  try {
    const { clone_id } = req.params;

    // If clone_id is provided, fetch and return clone data
    if (clone_id && clone_id !== 'undefined') {
      const clone = await CloneProfile.findOne({ clone_id })
        .populate('fileUploads', 'originalName fileSize uploadDate')

      if (!clone) {
        return res.status(404).json({
          success: false,
          message: "Clone not found",
          uiType: "create" // Indicate to show creation form
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Clone data for UI',
        uiType: "display", // Indicate to show clone data
        data: {
          cloneId: clone._id,
          cloneIdStr: clone.clone_id, // optional: keep this for lookup
          cloneName: clone.clone_name,
          tone: clone.tone,
          style: clone.style,
          values: clone.values,
          catchphrases: clone.catchphrases,
          dos: clone.dos,
          donts: clone.donts,
          description: clone.freeform_description,
          image: clone.image,
          fileUploads: clone.fileUploads || [],
          youtubeLinkUpload: clone.youtubeLinkUpload || [],
          otherLinkUpload: clone.otherLinkUpload || [],
          createdAt: clone.createdAt,
          updatedAt: clone.updatedAt
        }
      });
    }

    // If no clone_id provided, return creation form data
    return res.status(200).json({
      success: true,
      message: 'Clone creation form data',
      uiType: "create", // Indicate to show creation form
      data: {
        cloneName: "",
        tone: [],
        style: [],
        values: [],
        catchphrases: [],
        dos: "",
        donts: "",
        description: "",
        image: "default-avatar.png"
      }
    });

  } catch (error) {
    console.error("Error in getCloneUI:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching clone UI data",
      error: error.message
    });
  }
};

export const uploadFilesperId = async (req, res) => {
  try {
    const cloneId = req.params.clone_id;
    const savedClone = await CloneProfile.findOne({ clone_id: cloneId });

    if (!savedClone) {
      return res.status(404).json({
        success: false,
        message: "Clone not found",
      });
    }

    // Handle file uploads
    let uploadedFiles = [];

    if (req.files && req.files.length > 0) {
      const pdfFiles = req.files.filter(file => file.fieldname === 'uploadedFiles');

      if (pdfFiles.length > 0) {
        try {
          uploadedFiles = await uploadPDFs(pdfFiles, cloneId);

          if (uploadedFiles.length > 0) {
            savedClone.fileUploads = uploadedFiles.map(file => file.fileId);
            await savedClone.save();
          }
        } catch (error) {
          console.error("Error uploading files:", error);
        }
      }
    }

    console.log("Saved Clone:", savedClone);

    return res.status(201).json({
      success: true,
      message: 'Files uploaded and clone updated successfully',
    });

  } catch (error) {
    console.error("Error in UploadFilesperId:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading files or updating clone",
      error: error.message
    });
  }
};

export const uploadYoutubeLinks = async (req, res) => {
  const { clone_id } = req.params;
  const { youtubeLinks } = req.body;
  try {
    if (!youtubeLinks || !Array.isArray(youtubeLinks) || youtubeLinks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing youtubeLinks"
      });
    }

    const clone = await CloneProfile.findOne({ clone_id });

    if (!clone) {
      return res.status(404).json({
        success: false,
        message: "Clone not found"
      });
    }

    // Update youtube links
    clone.youtubeLinkUpload = youtubeLinks;
    await clone.save();

    return res.status(200).json({
      success: true,
      message: 'YouTube links updated successfully',
      data: clone.youtubeLinkUpload
    });

  } catch (error) {
    console.error("Error updating YouTube links:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating YouTube links",
      error: error.message
    });
  }
}

export const uploadOtherLinks = async (req, res) => {
  const { clone_id } = req.params;
  const { otherLinks } = req.body;
  try {
    if (!otherLinks || !Array.isArray(otherLinks) || otherLinks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing otherLinks"
      });
    }

    const clone = await CloneProfile.findOne({ clone_id });

    if (!clone) {
      return res.status(404).json({
        success: false,
        message: "Clone not found"
      });
    }

    // Update other links
    clone.otherLinkUpload = otherLinks;
    await clone.save();

    return res.status(200).json({
      success: true,
      message: 'Other links updated successfully',
      data: clone.otherLinkUpload
    });

  } catch (error) {
    console.error("Error updating other links:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating other links",
      error: error.message
    });
  }
};

export const getFilesByCloneId = async (req, res) => {
  const { clone_id } = req.params;

  try {
    const files = await File.find({ cloneId: clone_id });

    if (!files.length) {
      return res.status(404).json({
        success: false,
        message: 'No files found for this clone',
      });
    }

    const response = files.map(file => ({
      id: file._id,
      fileId: file.fileId,
      name: file.originalName,
      size: file.fileSize,
      mimeType: file.mimeType,
      uploadedAt: file.uploadDate,
      url: `${process.env.BACKEND_URL}/clone/file/${file.fileId}`, // ✅ correct route
    }));

    res.status(200).json({ success: true, files: response });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching files',
      error: error.message,
    });
  }
};

export const getPDFById = async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.fileId);

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'pdfs',
    });

    const downloadStream = bucket.openDownloadStream(fileId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline', // Use "attachment" if you want it to be downloadable
    });

    downloadStream.pipe(res);

    downloadStream.on('error', (err) => {
      console.error("Stream error:", err);
      res.status(404).json({ success: false, message: 'File not found' });
    });

  } catch (err) {
    console.error("Error fetching PDF:", err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


export {
  uploadForClone,
  uploadForPDFs
};