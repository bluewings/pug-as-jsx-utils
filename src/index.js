import pug from 'pug';
import prettier from 'prettier';
import {
  analyzeJsx, hashCode, getImports, getUsage, removeDupAttrs,
  removeIndent, removePugComment, babelTransform, getTransformFuncs,
} from './lib/util';
import { transform } from './lib/pug-syntax';
import template from './lib/template';
import works from './rules/works';
import annotations from './rules/annotations';
import codemod from './codemod';
import addRoleButton from './codemod/addRoleButton';

const path = require('path');
const generateCode = require('pug-code-gen');
const runtimeWrap = require('pug-runtime/wrap');

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

const resolveModule = (moduleName, rootDir) => {
  if (moduleName && rootDir) {
    return moduleName.replace(/^@\//, `${rootDir}/`);
  }
  return moduleName;
};

const processJsxCode = (jsxCode, options, localWorks, annot, resolves) => {
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

  // fix rest props
  jsxCode = jsxCode.replace(/({\.\.\..+})="__rest"/g, '$1');

  try {
    jsxCode = prettier.format(`(${jsxCode})`, jsxPrettierOptions);
  } catch (err) {
    jsxCode = prettier.format(`<>${jsxCode}</>`, jsxPrettierOptions);
  }

  // autofix features.
  if (options.autoFix) {
    jsxCode = addRoleButton(jsxCode);
  }

  let result = { jsx: jsxCode.trim().replace(/(^;|;$)/g, '') };
  if (options.analyze) {
    const analyzed = analyzeJsx(result.jsx, analyzeJsxOptions);
    const { used, imports } = getImports(analyzed.variables, resolves);
    const variables = analyzed.variables.filter(e => used.indexOf(e) === -1);
    if (analyzed.useRequire) {
      Object.entries(analyzed.requires).forEach(([ search, [ replacement ] ]) => result.jsx = result.jsx.replace(new RegExp(search, 'g'), replacement));
    }
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
}

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

  const mixins = {};
  const plugins = [{
    postParse: (ast) => {
      ast = transform(ast);
      ast.nodes
        .filter(({ type, call }) => type === 'Mixin' && !call)
        .forEach(({ name, block }) => mixins[name] = block);
      return ast;
    }
  }];

  // pug to html
  const pugOptions = { pretty: true, filename: options.resourcePath, basedir: options.rootDir };
  const jsxCode = `\n${pug.render(pugCode, { plugins, ...pugOptions })}\n`;

  const result = processJsxCode(jsxCode, options, localWorks, annot, resolves);
  Object.entries(mixins).forEach(([ name, ast ]) => {
    const code = runtimeWrap(generateCode(ast, pugOptions))(pugOptions);
    const { jsx, useThis, useMacro, useFragment, variables, requires, imports } = processJsxCode(code, options, localWorks, annot, resolves);
    Object.entries({ useMacro, useFragment }).forEach(([ name, value ]) => result[name] = result[name] || value);
    Object.assign(result.requires, requires);
    if (imports.length) {
      result.imports = Array.from(new Set(result.imports.concat(imports)));
    }
    mixins[name] = { jsx, useThis, variables };
  });
  result.mixins = mixins;

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
  let { rootDir } = options;
  if (rootDir && options.resourcePath) {
    const [, ...rest] = options.resourcePath.split(rootDir);
    rootDir = rest
      .join(rootDir)
      .split(path.sep)
      .filter((e, i, arr) => e && i < arr.length - 1)
      .fill('..')
      .join('/');
  }
  let result = toJsx(source, {
    ...options,
    analyze: options.template || options.analyze,
  });

  const getPragma = (type) => {
    switch ((type || '').trim().toLowerCase()) {
      case 'preact':
      case 'h':
        return ['preact', 'Preact'];
      case 'mithril':
      case 'm':
        return ['mithril', 'm'];
      default:
        return ['react', 'React'];
    }
  };

  const [_module, _import] = getPragma(options.pragma);

  if (options.template) {
    result.imports = result.imports.concat(Object.values(result.requires).map(([ name, moduleName ]) => ({ name, moduleName })));
    const jsxTemplate = [
      result.useFragment
        ? `import ${_import}, { Fragment } from '${_module}';`
        : `import ${_import} from '${_module}';`,
      ...(result.imports || []).map(({ name, member, moduleName }) => {
        const chunk = [
          name,
          member && member.length > 0 && `{ ${member.map(e => (e.alias ? `${e.name} as ${e.alias}` : e.name)).join(', ')} }`,
        ].filter(e => e).join(', ');
        return `import ${chunk} from '${resolveModule(moduleName, rootDir)}';`;
      }),
      '',
      result.useMacro && template.macro,
      `export default function (${result.variables.length > 0 ? '__params = {}' : ''}) {`,
      result.variables.length > 0 && `  const { ${result.variables.join(', ')} } = __params;`,
      '  return (',
      result.jsx,
      '  );',
      '}',
      ...Object.entries(result.mixins).map(([ name, { jsx, variables } ]) => [
        '\n',
        `export function ${name}(${variables.length > 0 ? '__params = {}' : ''}) {`,
        variables.length > 0 && `  const { ${variables.join(', ')} } = __params;`,
        '  return (',
        jsx,
        '  );',
        '}',
      ].filter(Boolean).join('\n')),
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
  codemod,
  addRoleButton,
};
