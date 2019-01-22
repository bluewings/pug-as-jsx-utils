import { hashCode } from '../lib/util';

const works = [
  // combine the contents of two className attributes.
  {
    post: [
      /\s+className=("([^"]+)"(.*)\s+className={(.*?)}((\s+[a-zA-Z0-9-]+=)|(\s*>)))/g,
      (context, whole, p1, p2, p3, p4, p5) => ` className={"${p2} " + (${p4})}${p3} ${p5}`,
    ],
  },

  // place a line break between tags
  { post: [/(>)\s*(<[a-zA-Z])/g, (context, whole, p1, p2) => `${p1}\n${p2}`] },

  // keep the jsx syntax before pug.render and return when the conversion is done
  {
    pre: [
      /\{([^{}]+)\}/g,
      (context, whole, p1) => {
        const content = p1
          .replace(/^\{(.*)\}$/, '$1')
          .replace(/\n\s+\|\s+/g, ' ')
          .replace(/\\\n\s+/g, ' ');
        const key = hashCode(content);
        context[key] = content;
        return `{__archived_${key}__}`;
      },
    ],
    post: [
      /\{__archived_([a-z0-9]+)__\}/g,
      (context, whole, p1) => `{${context[p1]}}`,
    ],
  },

  // use nested components
  // eg. Modal.Body
  {
    pre: [/(\s*[A-Z][a-zA-Z0-9]*)\.([A-Z][a-zA-Z0-9]*)(\s|\n|\()/g, (context, whole, p1, p2, p3) => `${p1}___dot_btw_cpnts___${p2}${p3}`],
    post: [/___dot_btw_cpnts___/g, '.'],
  },

  // use regular jsx syntax for tags: __jsx
  {
    pre: [/([ (]{1})__jsx=/g, (context, whole, p1) => {
      context.index = (context.index || 0) + 1;
      return `${p1}jsx-syntax-${context.index}--=`;
    }],
    post: [/jsx-syntax-[0-9]+--=/g, ''],
  },

  // https://reactjs.org/docs/dom-elements.html#differences-in-attributes
  // class → className
  // for → htmlFor
  { post: [/\s+class="/g, ' className="'] },
  { post: [/\s+for="/g, ' htmlFor="'] },

  // comment
  { post: [/<!--(.*?)-->/g, (context, whole, p1) => `{ /* ${p1.replace(/\/\*/g, ' ').replace(/\*\//g, ' ').trim()} */ }`] },

  // remove the double quotes surrounding the jsx grammar.
  { post: [/="(\{.*?\})[;]{0,1}"/g, (context, whole, p1) => `=${p1.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&')}`] },
];

export default works;
