const lex = require('pug-lexer');
const parse = require('pug-parser');
const walk = require('pug-walk');

const transform = function (ast) {
  let endBlock;
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
        node.val = `"{${node.val}}"`;
        break;
      case 'Conditional':
        {
          let nodes;
          if (node.alternate) {
            nodes = getConditionalNodes(node, endBlock);
          } else {
            const { test, consequent, line, column } = node;
            nodes = [
              !endBlock ? { type: 'Text', val: '{', line, column } : null,
              { type: 'Text', val: `${node.test} && (`, line, column },
              consequent,
              !endBlock ? { type: 'Text', val: ')}', line, column } : null,
            ].filter(Boolean);
          }
          replace(nodes);
          endBlock = endBlock || nodes[nodes.length - 1];
        }
        break;
      case 'Each':
        {
          const { obj, val, key, block, line, column } = node;
          const nodes = [
            !endBlock ? { type: 'Text', val: '{', line, column } : null,
            { type: 'Text', val: `__macro.for(${obj}).map((${val}${key ? `, ${key}` : ''}) => (`, line, column },
            block,
            { type: 'Text', val: '))', line, column },
            !endBlock ? { type: 'Text', val: '}', line, column } : null,
          ].filter(Boolean);
          replace(nodes);
          endBlock = endBlock || nodes[nodes.length - 1];
        }
        break;
      case 'Case':
        {
          const { type, expr, block, line, column } = node;
          const nodes = [
            !endBlock ? { type: 'Text', val: '{', line, column } : null,
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
            !endBlock ? { type: 'Text', val: '}', line, column } : null,
          ].filter(Boolean);
          replace(nodes);
          endBlock = endBlock || nodes[nodes.length - 1];
        }
        break;
    }
  }, node => {
    if (node === endBlock) {
      endBlock = null;
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

function getConditionalNodes(node, endBlock, deep) {
  const { type, test, consequent, alternate, line, column } = node;
  if (type !== 'Conditional') {
    return [
      { type: 'Text', val: '(', line, column },
      node,
      { type: 'Text', val: '\n)', line, column },
    ];
  }
  return [
    !deep && !endBlock ? { type: 'Text', val: '{', line, column } : null,
    { type: 'Text', val: `${node.test} ? `, line, column },
    ...[
      { type: 'Text', val: '(', line, column },
      consequent,
      { type: 'Text', val: ')', line, column },
    ],
    { type: 'Text', val: ' : ', line, column },
    ...(!alternate ? [ { type: 'Text', val: 'null', line, column } ] : getConditionalNodes(alternate, endBlock, true)),
    !deep && !endBlock ? { type: 'Text', val: '}', line, column } : null,
  ].filter(Boolean);
}
