/* eslint-disable no-param-reassign */
import j from 'jscodeshift';
import { getSource } from './codemod.helper';

const addRoleAttr = (content) => {
  const jsxRoot = getSource(content, 'generated.jsx')
  jsxRoot.find(j.JSXOpeningElement)
    .filter((e) => {
      const node = e.node || {};
      const tagName = node.name && node.name.name;
      const attrs = (node.attributes || []).map(e => e.name && e.name.name);
      return !['a', 'button'].includes(tagName) &&
        attrs.includes('onClick') && 
        !attrs.includes('role');
    }).forEach((e) => {
      e.node.attributes = [
        ...e.node.attributes,
        j.jsxAttribute(j.jsxIdentifier('role'), j.stringLiteral('button')),
      ];
    });

  return jsxRoot.toSource({
    quote: 'single',
    trailingComma: true,
  });
};

export default addRoleAttr;
