const catchAsync = require('../../utils/catch-async');
const { sendSuccess, sendCreated, sendNoContent } = require('../../utils/response');
const { t } = require('../../utils/i18n');
const contractService = require('./contract.service');

const list = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const { type } = req.query;

  const result = await contractService.listContracts({ type, page, limit });
  sendSuccess(res, { data: result.items, meta: result.meta });
});

const getById = catchAsync(async (req, res) => {
  const contract = await contractService.getContractById(req.params.id, req.locale);
  sendSuccess(res, { data: { contract } });
});

const create = catchAsync(async (req, res) => {
  const contract = await contractService.createContract(req.body, req.locale);
  sendCreated(res, { data: { contract } });
});

const update = catchAsync(async (req, res) => {
  const contract = await contractService.updateContract(
    req.params.id,
    req.body,
    req.locale
  );
  sendSuccess(res, { data: { contract } });
});

const remove = catchAsync(async (req, res) => {
  await contractService.deleteContract(req.params.id, req.locale);
  sendNoContent(res);
});

const accept = catchAsync(async (req, res) => {
  const result = await contractService.acceptContract(
    req.params.id,
    req.user,
    req,
    req.locale
  );

  sendSuccess(res, {
    message: t('CONTRACT_ACCEPTED_SUCCESS', req.locale),
    data: result,
  });
});

const myAcceptances = catchAsync(async (req, res) => {
  const acceptances = await contractService.listUserAcceptances(req.user.id);
  sendSuccess(res, { data: acceptances });
});

const listAcceptances = catchAsync(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const { userId, contractId } = req.query;

  const result = await contractService.listAllAcceptances({
    page,
    limit,
    userId,
    contractId,
  });

  sendSuccess(res, { data: result.items, meta: result.meta });
});

const downloadPdf = catchAsync(async (req, res) => {
  const pdf = await contractService.downloadContractPdf(req.params.id, req.user, req.locale);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${pdf.filename}"`);
  res.sendFile(pdf.path);
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  accept,
  myAcceptances,
  listAcceptances,
  downloadPdf,
};
