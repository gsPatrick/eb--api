const path = require('path');
const express = require('express');
const config = require('../config');
const { applyOpenCorsHeaders } = require('./cors.middleware');

const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'public', 'uploads');

function buildFrameAncestorsDirective() {
  if (config.cors.allowAll) {
    return "frame-ancestors *";
  }

  if (!config.cors.origins?.length) {
    return "frame-ancestors 'self'";
  }

  return `frame-ancestors 'self' ${config.cors.origins.join(' ')}`;
}

const FRAME_ANCESTORS = buildFrameAncestorsDirective();

function configureUploadHeaders(res, filePath) {
  if (config.cors.allowAll) {
    applyOpenCorsHeaders({ headers: {} }, res);
  }

  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', FRAME_ANCESTORS);
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  if (filePath.toLowerCase().endsWith('.pdf')) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline');
  }
}

function createUploadsStaticMiddleware() {
  return express.static(UPLOADS_ROOT, {
    setHeaders: configureUploadHeaders,
    fallthrough: true,
  });
}

module.exports = {
  UPLOADS_ROOT,
  createUploadsStaticMiddleware,
};
