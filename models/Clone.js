// models/CloneProfile.js
import mongoose from 'mongoose';

const cloneProfileSchema = new mongoose.Schema({
  clone_id: {
    type: String,
    unique: true,
    required: true,
  },
  clone_name: {
    type: String,
    required: true,
  },
  tone: {
    type: [String],
    default: [],
    required: true,
  },
  style: {
    type: [String],
    default: [],
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  catchphrases: {
    type: [String],
    default: [],
  },
  values: {
    type: [String],
    default: [],
  },
  dos: {
    type: String,
  },
  donts: {
    type: String,
  },
  freeform_description: {
    type: String,
  },
  fileUploads: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File'
  }],
  youtubeLinkUpload: {
    type: [String],
    default: [],
  },
  otherLinkUpload: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ["upload", "approved", "publish"],
    default: "upload",
  }
}, { timestamps: true });

const CloneProfile = mongoose.model('CloneProfile', cloneProfileSchema);
export default CloneProfile;
