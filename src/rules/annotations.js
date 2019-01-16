const handler = {
  imports: (current, pattern) => {
    const [, moduleName, name] = current.match(pattern);
    return {
      resolve: { [moduleName]: name },
      replacement: '',
    };
  },
  decorator: (current, pattern) => {
    const [,,,, decorator] = current.match(pattern);
    return {
      startBlock: `{${decorator}(`,
      replacement: current.replace(pattern, '$1$2').replace(/\(\s*,\s*/, '('),
      endBlock: ')}',
    };
  },
  for: (current, pattern) => {
    const [,,,, parenthesesL, item,, key,, index, parenthesesR, items] = current.match(pattern);
    let paramKey;
    let paramIndex = '';
    if (!parenthesesL && !parenthesesR && !key) {
      paramKey = 'i';
    } else if (parenthesesL && parenthesesR && key) {
      paramKey = key;
      if (index) {
        paramIndex = `, ${index}`;
      }
    } else {
      return {
        startBlock: '',
        replacement: current,
        endBlock: '',
      };
    }
    return {
      startBlock: `{__macro.for(${items}).map((${item}, ${paramKey}${paramIndex}) => (`,
      replacement: current.replace(pattern, `$1$2key='{${paramKey}}'`),
      endBlock: '))}',
    };
  },
  repeat: (current, pattern) => {
    const [,,,, items, item,, index = 'i'] = current.match(pattern);
    let replacement;
    if (current.match(/[, ]key\s*=/)) {
      replacement = current.replace(pattern, '$1$2');
    } else {
      replacement = current.replace(pattern, `$1$2key='{${index}}'`);
    }
    replacement = replacement.replace(/^(\s*[^(]+\()\s*,\s*/, '$1');
    return {
      startBlock: `{(${items} || []).map((${item}, ${index}) =>`,
      replacement,
      endBlock: ')}',
    };
  },
  if: (current, pattern) => {
    const [,,,, condition] = current.match(pattern);
    return {
      startBlock: `{(${condition}) && (`,
      replacement: current.replace(pattern, '$1$2').replace(/\(\s*,\s*/, '('),
      endBlock: ')}',
    };
  },
  unless: (current, pattern) => {
    const [,,,, condition] = current.match(pattern);
    return {
      startBlock: `{!(${condition}) && (`,
      replacement: current.replace(pattern, '$1$2').replace(/\(\s*,\s*/, '('),
      endBlock: ')}',
    };
  },
  show: (current, pattern) => ({
    replacement: current.replace(pattern, (whole, p1, p2, p3, p4) => `${p1 + p2}style='{{ display: (${p4.replace(/"/g, '"')} ? "" : "none") }}'`),
  }),
  hide: (current, pattern) => ({
    replacement: current.replace(pattern, (whole, p1, p2, p3, p4) => `${p1 + p2}style='{{ display: (${p4.replace(/"/g, '"')} ? "none" : "") }}'`),
  }),
};

const annotations = [
  // imports
  {
    pattern: /^\s*\/\/\s+@import\s+([^\s]+)\s+=>\s+([^\s]+)$/,
    process: handler.imports,
  },

  // decorator
  {
    pattern: /^(\s*)(.*)(@decorator='\s*([^\s]+)\s*')/,
    process: handler.decorator,
  },
  {
    pattern: /^(\s*)(.*)(@decorator="\s*([^\s]+)\s*")/,
    process: handler.decorator,
  },

  // for
  {
    pattern: /^(\s*)(.*)(@for='\s*([(]{0,1})\s*([^\s]+)\s*(,\s+([a-zA-Z0-9_]+)){0,1}\s*(,\s+([a-zA-Z0-9_]+)){0,1}\s*([)]{0,1})\s+in\s+([^\n]+?)\s*')/,
    process: handler.for,
  },
  {
    pattern: /^(\s*)(.*)(@for="\s*([(]{0,1})\s*([^\s]+)\s*(,\s+([a-zA-Z0-9_]+)){0,1}\s*(,\s+([a-zA-Z0-9_]+)){0,1}\s*([)]{0,1})\s+in\s+([^\n]+?)\s*")/,
    process: handler.for,
  },

  // repeat
  {
    pattern: /^(\s*)(.*)(@repeat='\s*([^\n]+?)\s+as\s+([^\s]+)\s*(,\s+([a-zA-Z0-9_]+)){0,1}\s*')/,
    process: handler.repeat,
  },
  {
    pattern: /^(\s*)(.*)(@repeat="\s*([^\n]+?)\s+as\s+([^\s]+)\s*(,\s+([a-zA-Z0-9_]+)){0,1}\s*")/,
    process: handler.repeat,
  },

  // if
  {
    pattern: /^(\s*)(.*)(@if='([^']+)')/,
    process: handler.if,
  },
  {
    pattern: /^(\s*)(.*)(@if="([^"]+)")/,
    process: handler.if,
  },

  // unless
  {
    pattern: /^(\s*)(.*)(@unless='([^']+)')/,
    process: handler.unless,
  },
  {
    pattern: /^(\s*)(.*)(@unless="([^"]+)")/,
    process: handler.unless,
  },

  // show
  {
    pattern: /^(\s*)(.*)(@show='([^']+)')/,
    process: handler.show,
  },
  {
    pattern: /^(\s*)(.*)(@show="([^"]+)")/,
    process: handler.show,
  },

  // hide
  {
    pattern: /^(\s*)(.*)(@hide='([^']+)')/,
    process: handler.hide,
  },
  {
    pattern: /^(\s*)(.*)(@hide="([^"]+)")/,
    process: handler.hide,
  },
];

export default annotations;
