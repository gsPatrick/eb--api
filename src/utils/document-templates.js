const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const { formatUsd } = require('./financial');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'documents');
const STYLES_PATH = path.join(TEMPLATES_DIR, 'styles', 'document.css');

const compiled = {};

function readStyles() {
  return fs.readFileSync(STYLES_PATH, 'utf8');
}

function registerPartials() {
  const partialsDir = path.join(TEMPLATES_DIR, 'partials');
  if (!fs.existsSync(partialsDir)) return;

  for (const file of fs.readdirSync(partialsDir)) {
    if (!file.endsWith('.hbs')) continue;
    const name = path.basename(file, '.hbs');
    const source = fs.readFileSync(path.join(partialsDir, file), 'utf8');
    Handlebars.registerPartial(name, source);
  }
}

function getTemplate(name) {
  if (compiled[name]) return compiled[name];

  const filePath = path.join(TEMPLATES_DIR, `${name}.hbs`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Document template not found: ${name}`);
  }

  registerPartials();
  const source = fs.readFileSync(filePath, 'utf8');
  compiled[name] = Handlebars.compile(source, { noEscape: false });
  return compiled[name];
}

function renderDocumentTemplate(name, data) {
  const template = getTemplate(name);
  return template({
    ...data,
    styles: readStyles(),
  });
}

Handlebars.registerHelper('eq', (a, b) => a === b);

module.exports = {
  renderDocumentTemplate,
  readStyles,
  TEMPLATES_DIR,
};
