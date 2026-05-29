const financialSettingsService = require('./financial-settings.service');

async function getSettings(req, res, next) {
  try {
    const settings = await financialSettingsService.getFinancialSettings();
    res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
}

async function updateSettings(req, res, next) {
  try {
    const settings = await financialSettingsService.updateFinancialSettings(req.body, req.locale);
    res.json({ success: true, settings });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getSettings,
  updateSettings,
};
