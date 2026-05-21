const catchAsync = require('../../utils/catch-async');
const { sendSuccess } = require('../../utils/response');
const { reverseGeocode, searchAddress } = require('../../utils/geocoding');

const reverse = catchAsync(async (req, res) => {
  const { lat, lng, lon } = req.query;
  const result = await reverseGeocode(lat, lng || lon);
  sendSuccess(res, { data: result });
});

const search = catchAsync(async (req, res) => {
  const q = req.query.q || req.query.query || '';
  const limit = Number(req.query.limit) || 5;
  const results = await searchAddress(q, limit);
  sendSuccess(res, { data: results });
});

module.exports = {
  reverse,
  search,
};
