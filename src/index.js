import pug from 'pug';
import prettier from 'prettier';
import {
  analyzeJsx, hashCode, getImports, getUsage, removeDupAttrs,
  removeIndent, removePugComment, babelTransform, getTransformFuncs,
} from './lib/util';
import template from './lib/template';
import works from './rules/works';
import annotations from './rules/annotations';

const jsxPrettierOptions = {
  parser: 'babel',
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  jsxSingleQuote: false,
  bracketSpacing: true,
  jsxBracketSameLine: false,
};

const analyzeJsxOptions = {
  ignore: ['React'],
};

const toJsx = (source, options = {}) => {
  const localWorks = works.map(({ pre, post }) => ({ pre, post, context: {} }));

  // force at least two spaces between depths
  let pugCode = `\n${source.split(/\r\n/).join('\n').split(/\n/)
    .map(e => e.replace(/^(\t*)/, (whole, p1) => p1.replace(/\t/g, '  ')))
    .map(e => e.replace(/^(\s*)/, (whole, p1) => p1.replace(/\s/g, '  ')))
    .join('\n')}\n`;
  pugCode = removeIndent(pugCode);
  pugCode = removePugComment(pugCode);

  // convert annotations to tags with preprocessing
  const { lines, annot, resolves } = pugCode
    .split(/\n/)
    .reduce((dict, curr) => {
      let stepBack = '';
      const indent = Array(curr.search(/[^\s]/) + 1).join(' ');
      annotations.forEach((annotation) => {
        if (curr.match(annotation.pattern)) {
          const {
            startBlock, replacement, endBlock, resolve,
          } = annotation.process(curr, annotation.pattern);
          if (resolve) {
            dict.resolves = { ...dict.resolves, ...resolve };
          }
          if (startBlock || endBlock) {
            const content = { startBlock, endBlock };
            const key = hashCode(content);
            dict.lines.push(`${indent}annot_${key}`);
            dict.annot[key] = content;
            stepBack = ' ';
          }
          curr = replacement;
        }
      });
      dict.lines.push(`${stepBack}${curr}`);
      return dict;
    }, { lines: [], annot: {}, resolves: { ...options.resolve } });
  if (!options.analyze && Object.keys(resolves).length > 0) {
    options.analyze = true;
  }
  pugCode = removeIndent(lines.join('\n'));

  // pre-processing pug.render
  pugCode = localWorks
    .filter(({ pre }) => pre && pre.length === 2)
    .map(({ pre, context }) => [...pre, context])
    .reduce((prev, [pattern, replaceFn, context]) => {
      if (typeof replaceFn !== 'function') {
        return prev.replace(pattern, replaceFn);
      }
      return prev.replace(pattern, (...args) => replaceFn(context, ...args));
    }, pugCode);

  // remove duplicate attributes
  pugCode = removeDupAttrs(pugCode);

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

  jsxCode = getTransformFuncs(options).reduce((prev, [pattern, replaceFn]) => {
    const regexp = new RegExp(new RegExp(pattern, '').toString().replace(/^\/([\s\S]+)\/$/, '([\\s\\S])($1)([\\s\\S])'), 'g');
    return ` ${prev} `.replace(regexp, (...all) => {
      const original = all.shift();
      const args = all.slice(0, all.length - 2);
      const preChar = args.shift();
      const postChar = args.pop();
      const type = preChar === '"' && postChar === '"' ? 'attribute' : 'text';
      const replaced = replaceFn(type, ...args);
      if (typeof replaced === 'string') {
        return type === 'text' ? `${preChar}${replaced}${postChar}` : replaced;
      }
      return original;
    });
  }, jsxCode);

  // remove the outer brackets
  jsxCode = jsxCode.replace(/^\s*{([\s\S]+)}\s*$/, '$1');

  try {
    jsxCode = prettier.format(`(${jsxCode})`, jsxPrettierOptions);
  } catch (err) {
    jsxCode = prettier.format(`<>${jsxCode}</>`, jsxPrettierOptions);
  }

  let result = { jsx: jsxCode.trim().replace(/(^;|;$)/g, '') };
  if (options.analyze) {
    const analyzed = analyzeJsx(result.jsx, analyzeJsxOptions);
    const { used, imports } = getImports(analyzed.variables, resolves);
    const variables = analyzed.variables.filter(e => used.indexOf(e) === -1);
    result = {
      ...result,
      ...analyzed,
      variables,
      imports: imports.map(e => ({
        ...e,
        moduleName: e.moduleName.replace(/^(\.[a-zA-Z0-9.]+)$/, '%BASENAME%$1'),
      })),
    };
  }

  return result;
};

const pugToJsx = (source, userOptions = {}) => {
  const options = {
    template: false,
    analyze: false,
    resolve: {},
    transform: [],
    ...userOptions,
  };

  let result = toJsx(source, {
    ...options,
    analyze: options.template || options.analyze,
  });

  if (options.template) {
    const jsxTemplate = [
      result.useFragment ? "import React, { Fragment } from 'react';" : "import React from 'react';",
      ...(result.imports || []).map(({ name, member, moduleName }) => {
        const chunk = [
          name,
          member && member.length > 0 && `{ ${member.map(e => (e.alias ? `${e.name} as ${e.alias}` : e.name)).join(', ')} }`,
        ].filter(e => e).join(', ');
        return `import ${chunk} from '${moduleName}';`;
      }),
      '',
      result.useMacro && template.macro,
      `export default function (${result.variables.length > 0 ? '__params = {}' : ''}) {`,
      result.variables.length > 0 && `  const { ${result.variables.join(', ')} } = __params;`,
      '  return (',
      result.jsx,
      '  );',
      '}',
    ].filter(e => e !== false).join('\n');
    result = {
      ...result,
      jsxTemplate: prettier.format(jsxTemplate, {
        ...jsxPrettierOptions,
        semi: true,
      }),
      usage: getUsage(result),
    };
  }

  return result;
};

export {
  pugToJsx,
  analyzeJsx,
  removeIndent,
  babelTransform,
};
