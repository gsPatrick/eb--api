const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { getUploadDir, getAvatarDir, getMessagesDir, ensureUploadDir, ensureAvatarDir, ensureMessagesDir } = require('../utils/storage');

ensureUploadDir();
ensureAvatarDir();
ensureMessagesDir();

function createDiskStorage(getDir) {
  return multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, getDir());
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });
}

function imageFileFilter(_req, file, cb) {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
    return;
  }

  cb(new Error('INVALID_FILE_TYPE'));
}

function messageAttachmentFileFilter(_req, file, cb) {
  const allowed = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(new Error('INVALID_FILE_TYPE'));
}

const orderPhotosUpload = multer({
  storage: createDiskStorage(getUploadDir),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 20,
  },
  fileFilter: imageFileFilter,
}).array('photos', 20);

const checkoutPhotosUpload = orderPhotosUpload;
const checkinPhotosUpload = orderPhotosUpload;

const avatarUpload = multer({
  storage: createDiskStorage(getAvatarDir),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter: imageFileFilter,
}).single('avatar');

const messageAttachmentUpload = multer({
  storage: createDiskStorage(getMessagesDir),
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 1,
  },
  fileFilter: messageAttachmentFileFilter,
}).single('attachment');

module.exports = {
  orderPhotosUpload,
  checkoutPhotosUpload,
  checkinPhotosUpload,
  avatarUpload,
  messageAttachmentUpload,
};
