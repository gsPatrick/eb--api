const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_SUBDIR = 'os';
const AVATAR_SUBDIR = 'avatars';
const MESSAGES_SUBDIR = 'messages';
const UPLOAD_RELATIVE_PATH = `/uploads/${UPLOAD_SUBDIR}`;
const AVATAR_RELATIVE_PATH = `/uploads/${AVATAR_SUBDIR}`;
const MESSAGES_RELATIVE_PATH = `/uploads/${MESSAGES_SUBDIR}`;

function getUploadDir() {
  return path.join(process.cwd(), 'public', 'uploads', UPLOAD_SUBDIR);
}

function getAvatarDir() {
  return path.join(process.cwd(), 'public', 'uploads', AVATAR_SUBDIR);
}

function getMessagesDir() {
  return path.join(process.cwd(), 'public', 'uploads', MESSAGES_SUBDIR);
}

function ensureMessagesDir() {
  const dir = getMessagesDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function ensureUploadDir() {
  const dir = getUploadDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function ensureAvatarDir() {
  const dir = getAvatarDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function buildPublicUrl(filename) {
  return `${UPLOAD_RELATIVE_PATH}/${filename}`;
}

function buildAvatarUrl(filename) {
  return `${AVATAR_RELATIVE_PATH}/${filename}`;
}

function buildMessageAttachmentUrl(filename) {
  return `${MESSAGES_RELATIVE_PATH}/${filename}`;
}

function processMessageAttachmentFile(file) {
  if (!file) {
    return null;
  }

  ensureMessagesDir();
  return {
    url: buildMessageAttachmentUrl(file.filename),
    name: file.originalname || file.filename,
  };
}

function saveBuffer(buffer, originalName) {
  ensureUploadDir();
  const ext = path.extname(originalName || '') || '.jpg';
  const filename = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(getUploadDir(), filename);

  fs.writeFileSync(filePath, buffer);

  return {
    filename,
    path: filePath,
    url: buildPublicUrl(filename),
  };
}

function processMulterFiles(files = []) {
  if (!files.length) {
    return [];
  }

  ensureUploadDir();
  return files.map((file) => buildPublicUrl(file.filename));
}

function processAvatarFile(file) {
  if (!file) {
    return null;
  }

  ensureAvatarDir();
  return buildAvatarUrl(file.filename);
}

function parsePhotoUrls(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === 'string' && item.trim());
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === 'string' && item.trim());
      }
    } catch {
      return value.trim() ? [value.trim()] : [];
    }
  }

  return [];
}

module.exports = {
  getUploadDir,
  getAvatarDir,
  getMessagesDir,
  ensureUploadDir,
  ensureAvatarDir,
  ensureMessagesDir,
  buildPublicUrl,
  buildAvatarUrl,
  buildMessageAttachmentUrl,
  saveBuffer,
  processMulterFiles,
  processAvatarFile,
  processMessageAttachmentFile,
  parsePhotoUrls,
  UPLOAD_RELATIVE_PATH,
  AVATAR_RELATIVE_PATH,
  MESSAGES_RELATIVE_PATH,
};
