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
  let pugCode = `\n${source.split(/\n/)
    .map(e => e.replace(/^(\t*)/, (whole, p1) => p1.replace(/\t/g, '  ')))
    .map(e => e.replace(/^(\s*)/, (whole, p1) => p1.replace(/\s/g, '  ')))
    .join('\n')}\n`;

  // convert annotations to tags with preprocessing
  const { lines, annot, imports } = pugCode.split(/\n/).reduce((dict, curr) => {
    let stepBack = '';
    annotations.forEach((annotation) => {
      if (curr.match(annotation.pattern)) {
        const {
          startBlock, replacement, endBlock, import: importAs,
        } = annotation.process(curr, annotation.pattern);
        if (importAs) {
          dict.imports.push(importAs);
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
  }, { lines: [], annot: {}, imports: [] });

  // pre-processing pug.render
  pugCode = localWorks
    .filter(({ pre }) => pre && pre.length === 2)
    .map(({ pre, context }) => [...pre, context])
    .reduce((prev, [pattern, replaceFn, context]) => {
      if (typeof replaceFn !== 'function') {
        return prev.replace(pattern, replaceFn);
      }
      return prev.replace(pattern, (...args) => replaceFn(context, ...args));
    }, lines.join('\n'));

  // pug to html
  let jsxCode = `\n${pug.render(pugCode, { pretty: true })}\n`;

  // post-processing pug.render
  // post-processing is performed in the reverse order of pre-processing
  jsxCode = localWorks
    .reverse()
    .filter(({ post }) => post && post.length === 2)
    .map(({ post, context }) => [...post, context])
    .reduce((prev, [pattern, replaceFn, context]) => {
      if (typeof replaceFn !== 'function') {
        return prev.replace(pattern, replaceFn);
      }
      return prev.replace(pattern, (...args) => replaceFn(context, ...args));
    }, jsxCode);

  // return the tag with the jsx block defined in the annotations
  jsxCode = Object.keys(annot)
    .reduce((prev, key) => prev
      .replace(new RegExp(`<annot_${key}>`, 'g'), annot[key].startBlock.trim())
      .replace(new RegExp(`</annot_${key}>`, 'g'), annot[key].endBlock.trim()),
    jsxCode);

  try {
    jsxCode = prettier.format(jsxCode, jsxPrettierOptions);
  } catch (err) {
    jsxCode = prettier.format(`<>${jsxCode}</>`, jsxPrettierOptions);
  }
  const jsx = jsxCode.trim().replace(/(^;|;$)/g, '');

  return { jsx, imports };
};

module.exports.pugToJsx = pugToJsx;
