const pug = require('pug');
const prettier = require('prettier');
const { hashCode } = require('./utils');
const works = require('./works');
const annotations = require('./annotations');

const jsxPrettierOptions = {
  parser: 'babylon',
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: false,
  jsxSingleQuote: false,
  bracketSpacing: true,
  jsxBracketSameLine: false,
};

const pugToJsx = (source) => {
  const localWorks = works.map(({ pre, post }) => ({ pre, post, context: {} }));

  // force at least two spaces between depths
  let code = `\n${source.split(/\n/)
    .map(e => e.replace(/^(\t*)/, (whole, p1) => p1.replace(/\t/g, '  ')))
    .map(e => e.replace(/^(\s*)/, (whole, p1) => p1.replace(/\s/g, '  ')))
    .join('\n')}\n`;

  // convert annotations to tags with preprocessing
  const { lines, annot, importAs } = code.split(/\n/).reduce((dict, curr) => {
    let stepBack = '';
    annotations.forEach((annotation) => {
      if (curr.match(annotation.pattern)) {
        const {
          startBlock, replacement, endBlock, importAs: imports,
        } = annotation.process(curr, annotation.pattern);
        if (imports) {
          dict.importAs.push(imports);
        }
        if (startBlock || endBlock) {
          const content = { startBlock, endBlock };
          const key = hashCode(content);
          const indent = Array(curr.search(/[^\s]/) + 1).join(' ');
          dict.lines.push(`${indent}annot_${key}`);
          dict.annot[key] = content;
          stepBack = ' ';
        }
        curr = replacement;
      }
    });
    dict.lines.push(`${stepBack}${curr}`);
    return dict;
  }, { lines: [], annot: {}, importAs: [] });

  // pre-processing pug.render
  code = localWorks
    .filter(({ pre }) => pre && pre.length === 2)
    .map(({ pre, context }) => [...pre, context])
    .reduce((prev, [pattern, replaceFn, context]) => {
      if (typeof replaceFn !== 'function') {
        return prev.replace(pattern, replaceFn);
      }
      return prev.replace(pattern, (...args) => replaceFn(context, ...args));
    }, lines.join('\n'));

  // pug to html
  code = `\n${pug.render(code, { pretty: true })}\n`;

  // post-processing pug.render
  // post-processing is performed in the reverse order of pre-processing
  code = localWorks
    .reverse()
    .filter(({ post }) => post && post.length === 2)
    .map(({ post, context }) => [...post, context])
    .reduce((prev, [pattern, replaceFn, context]) => {
      if (typeof replaceFn !== 'function') {
        return prev.replace(pattern, replaceFn);
      }
      return prev.replace(pattern, (...args) => replaceFn(context, ...args));
    }, code);

  // return the tag with the code block defined in the annotations
  code = Object.keys(annot)
    .reduce((prev, key) => prev
      .replace(new RegExp(`<annot_${key}>`, 'g'), annot[key].startBlock.trim())
      .replace(new RegExp(`</annot_${key}>`, 'g'), annot[key].endBlock.trim()),
    code);

  try {
    code = prettier.format(code, jsxPrettierOptions);
  } catch (err) {
    code = prettier.format(`<>${code}</>`, jsxPrettierOptions);
  }
  code = code.trim().replace(/(^;|;$)/g, '');

  return { code, importAs };
};

module.exports.pugToJsx = pugToJsx;
