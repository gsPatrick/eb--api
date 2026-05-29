const AppError = require('../../utils/app-error');
const { t } = require('../../utils/i18n');
const { USER_ROLES, CONTRACT_TYPES } = require('../../config/constants');
const { Contract, ContractAcceptance, User } = require('../../models');
const mailProvider = require('../../providers/mail/mail.provider');
const { generateContractPdf } = require('../../utils/pdf-documents');

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
}

async function listContracts({ type, page = 1, limit = 20 }) {
  const where = {};
  if (type) where.type = type;

  const offset = (page - 1) * limit;

  const { rows, count } = await Contract.findAndCountAll({
    where,
    order: [
      ['type', 'ASC'],
      ['version', 'DESC'],
    ],
    limit,
    offset,
  });

  return {
    items: rows,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 1,
    },
  };
}

async function getContractById(id, locale) {
  const contract = await Contract.findByPk(id);

  if (!contract) {
    throw new AppError(t('CONTRACT_NOT_FOUND', locale), 404, 'CONTRACT_NOT_FOUND');
  }

  return contract;
}

async function createContract(payload, locale) {
  const { title, content, type, version } = payload;

  if (!title || !content || !type) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['title', 'content', 'type'],
    });
  }

  if (!Object.values(CONTRACT_TYPES).includes(type)) {
    throw new AppError(t('VALIDATION_ERROR', locale), 400, 'VALIDATION_ERROR', {
      fields: ['type'],
    });
  }

  try {
    return Contract.create({
      title,
      content,
      type,
      version: version ?? 1,
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError(t('CONTRACT_VERSION_EXISTS', locale), 409, 'CONTRACT_VERSION_EXISTS');
    }
    throw error;
  }
}

async function updateContract(id, payload, locale) {
  const contract = await getContractById(id, locale);

  const updates = {};
  if (payload.title !== undefined) updates.title = payload.title;
  if (payload.content !== undefined) updates.content = payload.content;
  if (payload.type !== undefined) updates.type = payload.type;
  if (payload.version !== undefined) updates.version = payload.version;

  try {
    await contract.update(updates);
    return contract;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError(t('CONTRACT_VERSION_EXISTS', locale), 409, 'CONTRACT_VERSION_EXISTS');
    }
    throw error;
  }
}

async function deleteContract(id, locale) {
  const contract = await getContractById(id, locale);
  await contract.destroy();
}

async function acceptContract(contractId, user, req, locale) {
  const contract = await getContractById(contractId, locale);

  const existing = await ContractAcceptance.findOne({
    where: {
      userId: user.id,
      contractId: contract.id,
    },
  });

  if (existing) {
    throw new AppError(t('CONTRACT_ALREADY_ACCEPTED', locale), 409, 'CONTRACT_ALREADY_ACCEPTED');
  }

  if (user.role === USER_ROLES.ADMIN) {
    throw new AppError(t('CONTRACT_ADMIN_CANNOT_ACCEPT', locale), 403, 'FORBIDDEN');
  }

  if (contract.type === CONTRACT_TYPES.CLIENT_EB && user.role !== USER_ROLES.CLIENT) {
    throw new AppError(t('CONTRACT_WRONG_ROLE', locale), 403, 'FORBIDDEN');
  }

  if (contract.type === CONTRACT_TYPES.PROVIDER_EB && user.role !== USER_ROLES.PROVIDER) {
    throw new AppError(t('CONTRACT_WRONG_ROLE', locale), 403, 'FORBIDDEN');
  }

  const acceptance = await ContractAcceptance.create({
    userId: user.id,
    contractId: contract.id,
    acceptedAt: new Date(),
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || null,
  });

  await mailProvider.sendContractAcceptedEmail(user, contract);

  return {
    acceptance,
    contract,
  };
}

async function listUserAcceptances(userId) {
  return ContractAcceptance.findAll({
    where: { userId },
    include: [
      {
        model: Contract,
        as: 'contract',
        attributes: ['id', 'title', 'type', 'version'],
      },
    ],
    order: [['acceptedAt', 'DESC']],
  });
}

async function downloadContractPdf(contractId, user, locale) {
  const contract = await getContractById(contractId, locale);

  if (user.role === USER_ROLES.ADMIN) {
    return generateContractPdf(contract, {}, null);
  }

  if (contract.type === CONTRACT_TYPES.CLIENT_EB && user.role !== USER_ROLES.CLIENT) {
    throw new AppError(t('CONTRACT_WRONG_ROLE', locale), 403, 'FORBIDDEN');
  }

  if (contract.type === CONTRACT_TYPES.PROVIDER_EB && user.role !== USER_ROLES.PROVIDER) {
    throw new AppError(t('CONTRACT_WRONG_ROLE', locale), 403, 'FORBIDDEN');
  }

  const acceptance = await ContractAcceptance.findOne({
    where: { userId: user.id, contractId: contract.id },
  });

  return generateContractPdf(contract, user, acceptance);
}

async function listAllAcceptances({ page = 1, limit = 20, userId, contractId }) {
  const where = {};
  if (userId) where.userId = userId;
  if (contractId) where.contractId = contractId;

  const offset = (page - 1) * limit;

  const { rows, count } = await ContractAcceptance.findAndCountAll({
    where,
    include: [
      {
        model: Contract,
        as: 'contract',
        attributes: ['id', 'title', 'type', 'version'],
      },
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role'],
      },
    ],
    order: [['acceptedAt', 'DESC']],
    limit,
    offset,
  });

  return {
    items: rows,
    meta: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit) || 1,
    },
  };
}

module.exports = {
  listContracts,
  getContractById,
  createContract,
  updateContract,
  deleteContract,
  acceptContract,
  listUserAcceptances,
  listAllAcceptances,
  downloadContractPdf,
};
