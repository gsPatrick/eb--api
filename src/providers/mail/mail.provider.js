const config = require('../../config');

const MAIL_TEMPLATES = {
  CONTRACT_ACCEPTED: 'contract_accepted',
};

async function sendMail(to, subject, template, data = {}) {
  const payload = {
    to,
    subject,
    template,
    data,
    sentAt: new Date().toISOString(),
  };

  if (config.mail.driver === 'console' || !config.mail.enabled) {
    console.log('[mail:simulated]', JSON.stringify(payload, null, 2));
    return { success: true, simulated: true, ...payload };
  }

  // Ready for nodemailer / SendGrid integration
  // const transporter = nodemailer.createTransport(config.mail.smtp);
  // await transporter.sendMail({ from: config.mail.from, to, subject, html: renderTemplate(template, data) });

  console.log('[mail:queued]', JSON.stringify(payload, null, 2));
  return { success: true, queued: true, ...payload };
}

async function sendContractAcceptedEmail(user, contract) {
  return sendMail(
    user.email,
    'EB Services — Confirmação de aceite de contrato',
    MAIL_TEMPLATES.CONTRACT_ACCEPTED,
    {
      userName: user.name,
      contractTitle: contract.title,
      contractVersion: contract.version,
      acceptedAt: new Date().toISOString(),
    }
  );
}

module.exports = {
  sendMail,
  sendContractAcceptedEmail,
  MAIL_TEMPLATES,
};
