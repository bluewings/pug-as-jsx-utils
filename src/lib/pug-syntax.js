const lex = require('pug-lexer');
const parse = require('pug-parser');
const walk = require('pug-walk');

const transform = function (ast) {
  const nodes = [];
  walk(ast, (node, replace) => {
    switch (node.type) {
      case 'Tag':
        node.attrs.forEach(attr => {
          let { name, val } = attr;
          if (name.startsWith('...')) {
            attr.name = `{${attr.name}}`;
            attr.val = '"__rest"';
          } else if (!/^(['"]).*\1$/.test(val)) {
            val = !/^\(.*\)$/.test(val) ? val : val.substring(1, val.length - 1);
            attr.val = `"{${!val.replace ? val : val.replace(/"/g, '\\"')}}"`;
            attr.mustEscape = false;
          }
        });
        break;
      case 'Code':
        const { type } = nodes[0] || {};
        node.val = !(type && [ 'Conditional', 'Each', 'Case' ].includes(type)) ? `"{${node.val}}"` : `"${node.val}"`;
        return;
      case 'Conditional':
        {
          let replacement;
          if (node.alternate) {
            replacement = getConditionalNodes(node, nodes);
          } else {
            const { test, consequent, line, column } = node;
            replacement = [
              needWrap(nodes) ? { type: 'Text', val: '{', line, column } : null,
              { type: 'Text', val: `${node.test} && (`, line, column },
              consequent,
              { type: 'Text', val: ')', line, column },
              needWrap(nodes) ? { type: 'Text', val: '}', line, column } : null,
            ].filter(Boolean);
          }
          replace(replacement);
          node._last = replacement[replacement.length - 1];
        }
        break;
      case 'Each':
        {
          const { obj, val, key, block, line, column } = node;
          const replacement = [
            needWrap(nodes) ? { type: 'Text', val: '{', line, column } : null,
            { type: 'Text', val: `__macro.for(${obj}).map((${val}${key ? `, ${key}` : ''}) => (`, line, column },
            block,
            { type: 'Text', val: '))', line, column },
            needWrap(nodes) ? { type: 'Text', val: '}', line, column } : null,
          ].filter(Boolean);
          replace(replacement);
          node._last = replacement[replacement.length - 1];
        }
        break;
      case 'Case':
        {
          const { type, expr, block, line, column } = node;
          const replacement = [
            needWrap(nodes) ? { type: 'Text', val: '{', line, column } : null,
            { type: 'Text', val: '(() => {\n', line, column },
            { type: 'Text', val: `switch (${expr}) {\n`, line, column },
            ...block.nodes.map(node => [
              node.expr !== 'default' ? { type: 'Text', val: `case ${node.expr}:\n`, line, column } : { type: 'Text', val: 'default:\n', line, column },
              { type: 'Text', val: 'return (', line, column },
              node.block,
              { type: 'Text', val: ');\n', line, column },
            ]),
            { type: 'Text', val: '}\n', line, column },
            { type: 'Text', val: 'return null;\n', line, column },
            { type: 'Text', val: '})()', line, column },
            needWrap(nodes) ? { type: 'Text', val: '}', line, column } : null,
          ].filter(Boolean);
          replace(replacement);
          node._last = replacement[replacement.length - 1];
        }
        break;
      default:
        return;
    }
    nodes.unshift(node);
  }, node => {
    switch (node.type) {
      case 'Tag':
        nodes.shift();
        break;
      default:
        if (nodes[0] && (nodes[0] === node || nodes[0]._last === node)) {
          nodes.shift();
        }
        break;
    }
  });
  return ast;
}

const transformString = function (src) {
  const options = { src };
  const tokens = lex(src, options);
  const ast = parse(tokens, options);
  return transform(ast);
}

export { transform, transformString };

function needWrap(nodes) {
  const { type } = nodes[0] || {};
  return !type || type === 'Tag';
}

function getConditionalNodes(node, nodes) {
  const { type, test, consequent, line, column } = node;
  if (type !== 'Conditional') {
    return [
      { type: 'Text', val: '(', line, column },
      node,
      { type: 'Text', val: '\n)', line, column },
    ];
  }
  return [
    needWrap(nodes) ? { type: 'Text', val: '{', line, column } : null,
    { type: 'Text', val: `${node.test} ? `, line, column },
    ...[
      { type: 'Text', val: '(', line, column },
      consequent,
      { type: 'Text', val: ')', line, column },
    ],
    { type: 'Text', val: ' : ', line, column },
    ...(!node.alternate ? [ { type: 'Text', val: 'null', line, column } ] : getConditionalChildNodes(node, nodes)),
    needWrap(nodes) ? { type: 'Text', val: '}', line, column } : null,
  ].filter(Boolean);
}

function getConditionalChildNodes(node, nodes) {
  nodes.unshift(node);
  const result = getConditionalNodes(node.alternate, nodes);
  nodes.shift();
  return result;
}
