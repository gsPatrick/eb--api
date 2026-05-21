function sendSuccess(res, { statusCode = 200, message, data = null, meta = null } = {}) {
  const payload = {
    success: true,
    message: message || undefined,
    data,
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
}

function sendCreated(res, { message, data = null, meta = null } = {}) {
  return sendSuccess(res, { statusCode: 201, message, data, meta });
}

function sendNoContent(res) {
  return res.status(204).send();
}

module.exports = {
  sendSuccess,
  sendCreated,
  sendNoContent,
};
