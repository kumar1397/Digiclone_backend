import CloneProfile from '../models/Clone.js';
import cloudinary from 'cloudinary';
import multer from 'multer';
import GridFsStorage from 'multer-gridfs-storage';
import mongoose from 'mongoose';
import File from '../models/FileUpload.js';
import LinkUpload from '../models/LinkUpload.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create a new clone profile with file and link uploads
function isFileSupported(type, supportedTypes) {
  return supportedTypes.includes(type);
}

async function uploadtoCloudinary(fileBuffer, folder, quality) {
  console.log("In uploadCloudinary!!");
  try {
    const options = {
      folder,
      resource_type: "auto",
      quality: quality || "auto",
    };

    return await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            return reject(
              new Error(`Upload to Cloudinary failed: ${error.message}`)
            );
          }
          resolve(result);
        }
      );
      stream.end(fileBuffer);
    });
  } catch (error) {
    console.error("Error in Cloudinary upload function:", error);
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
        cloneId: new mongoose.Types.ObjectId(cloneId),
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
        link: `${process.env.BACKEND_URL}/file/${fileInfo._id}`,
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

async function LinksUpload(links) {
  try {
    const linksData = links || [];
    const youtubeLinks = [];
    const otherLinks = [];

    const processLink = (linkUrl) => {
      if (linkUrl.toLowerCase().includes('youtube')) {
        youtubeLinks.push(linkUrl);
      } else {
        otherLinks.push(linkUrl);
      }
    };

    if (Array.isArray(linksData)) {
      linksData.forEach(linkItem => {
        if (typeof linkItem === 'string') processLink(linkItem);
        else if (linkItem?.value) processLink(linkItem.value);
      });
    } else if (typeof linksData === 'string') {
      processLink(linksData);
    } else if (linksData?.value) {
      processLink(linksData.value);
    } else {
      throw new Error('Invalid link format');
    }

    const savedLinks = new LinkUpload({ youtubeLinks, otherLinks });
    await savedLinks.save();

    return savedLinks; // Return the saved links instead of sending response
  } catch (error) {
    console.error("Error saving links:", error);
    throw error; // Throw error instead of sending response
  }
};

// Configure multer for handling FormData - Memory storage for clone creation
const uploadForClone = multer({
  storage: multer.memoryStorage(), // Accepts all file types (images and PDFs)
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB limit
  },
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
  console.log("In createClone!!");
  console.log("Request body:", req.body);
  console.log("Request files:", req.files);
  console.log("Request query:", req.query);

  const {
    cloneName,
    tone,
    style,
    values,
    catchphrases,
    dos,
    donts,
    description,
    userId,
    links
  } = req.body;

  // Extract files from req.files
  const cloneImage = req.files?.cloneImage?.[0];
  const uploadedFiles = req.files?.files || [];
  
  let imageurl = null;
  let savedFiles = [];
  let savedLinks = null;

  try {
    // Step 1: Handle clone image upload if present
    if (cloneImage) {
      const supportedTypes = ["image/jpeg", "image/png"];
      const filetype = cloneImage.mimetype; // check MIME type
      
      if (!isFileSupported(filetype, supportedTypes)) {
        return res.status(415).json({
          success: false,
          message: "File format not supported. Allowable formats are png, jpg, and jpeg",
        });
      }

      const response = await uploadtoCloudinary(
        cloneImage.buffer,
        process.env.FOLDER_NAME,
        70
      );

      if (!response || !response.secure_url) {
        throw new Error("Invalid response from Cloudinary");
      }

      imageurl = response.secure_url;
      console.log("Uploaded image URL:", response.secure_url);
    }

    // Step 2: Create the clone record first
    const newClone = new CloneProfile({
      clone_name: cloneName,
      tone,
      style,
      image: imageurl || '', // Use uploaded image URL or empty string
      catchphrases: catchphrases ? (Array.isArray(catchphrases) ? catchphrases : [catchphrases]) : [],
      values: values ? (Array.isArray(values) ? values : [values]) : [],
      dos,
      donts,
      freeform_description: description,
    });

    const savedClone = await newClone.save();
    console.log("Clone created with ID:", savedClone._id);

    // Step 3: Handle PDF uploads using cloneId
    if (uploadedFiles.length > 0) {
      savedFiles = await uploadPDFs(uploadedFiles, savedClone._id);
      console.log("PDFs uploaded:", savedFiles);
    }

    // Step 4: Handle links upload
    if (links) {
      savedLinks = await LinksUpload(links);
      console.log("Links uploaded:", savedLinks);
    }

    // Step 5: Update clone with file and link references
    const updateData = {};
    if (savedFiles.length > 0) {
      updateData.fileUploads = savedFiles.map(file => file.fileId);
    }
    if (savedLinks) {
      updateData.linkUpload = savedLinks._id;
    }

    if (Object.keys(updateData).length > 0) {
      await CloneProfile.findByIdAndUpdate(savedClone._id, updateData);
    }

    return res.status(201).json({
      success: true,
      message: 'Clone created successfully',
      data: {
        cloneId: savedClone._id,
        cloneName: savedClone.clone_name,
        image: savedClone.image,
        files: savedFiles,
        links: savedLinks
      }
    });

  } catch (error) {
    console.error("Error in createClone:", error);
    return res.status(500).json({
      success: false,
      message: "Error creating clone",
      error: error.message
    });
  }
};

export {
  uploadForClone,
  uploadForPDFs
};