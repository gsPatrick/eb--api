const catchAsync = require('../../utils/catch-async');
const { sendSuccess } = require('../../utils/response');
const reportService = require('./report.service');

const billing = catchAsync(async (req, res) => {
  const { start_date: startDate, end_date: endDate, client_id: clientId } = req.query;

  const report = await reportService.getBillingReport({
    startDate,
    endDate,
    clientId,
    locale: req.locale,
  });

  sendSuccess(res, { data: report });
});

module.exports = {
  billing,
};
