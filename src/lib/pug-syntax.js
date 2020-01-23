const lex = require('pug-lexer');
const parse = require('pug-parser');
const walk = require('pug-walk');

const transform = function (ast) {
  let blockEndingNode;
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
          const getNodes = (node, recursive) => {
            const { type, test, consequent, line, column } = node;
            const alternate = !node.alternate ? [ { type: 'Text', val: 'undefined', line, column } ] : getNodes(node.alternate, true)
            if (type !== 'Conditional') {
              return [
                { type: 'Text', val: '(', line, column },
                node,
                { type: 'Text', val: '\n)', line, column },
              ];
            }
            return [
              !blockEndingNode && !recursive ? { type: 'Text', val: '{', line, column } : null,
              { type: 'Text', val: `${test} ? `, line, column },
              ...[
                { type: 'Text', val: '(', line, column },
                consequent,
                { type: 'Text', val: ')', line, column },
              ],
              { type: 'Text', val: ' : ', line, column },
              ...alternate,
              !blockEndingNode && !recursive ? { type: 'Text', val: '}', line, column } : null,
            ].filter(Boolean);
          }
          const nodes = getNodes(node);
          replace(nodes);
          blockEndingNode = blockEndingNode || nodes[nodes.length - 1];
        }
        break;
      case 'Each':
        {
          const { obj, val, key, block, line, column } = node;
          const nodes = [
            !blockEndingNode ? { type: 'Text', val: '{', line, column } : null,
            { type: 'Text', val: `__macro.for(${obj}).map((${val}${key ? `, ${key}` : ''}) => (`, line, column },
            block,
            { type: 'Text', val: '))', line, column },
            !blockEndingNode ? { type: 'Text', val: '}', line, column } : null,
          ].filter(Boolean);
          replace(nodes);
          blockEndingNode = blockEndingNode || nodes[nodes.length - 1];
        }
        break;
      case 'Case':
        {
          const { type, expr, block, line, column } = node;
          const nodes = [
            !blockEndingNode ? { type: 'Text', val: '{', line, column } : null,
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
            !blockEndingNode ? { type: 'Text', val: '}', line, column } : null,
          ].filter(Boolean);
          replace(nodes);
          blockEndingNode = blockEndingNode || nodes[nodes.length - 1];
        }
        break;
    }
  }, node => {
    if (node === blockEndingNode) {
      blockEndingNode = null;
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
