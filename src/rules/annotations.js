const annotations = [
  // imports
  {
    pattern: /^\/\/\s+@import\s+([^\s]+)\s+=>\s+([^\s]+)$/,
    process: (current, pattern) => {
      const [, moduleName, name] = current.match(pattern);
      return {
        resolve: { [moduleName]: name },
        replacement: '',
      };
    },
  },

  // decorator
  {
    pattern: /^(\s*)(.*)(@decorator='\s*([^\s]+)\s*')/,
    process: (current, pattern) => {
      const [,,,, decorator] = current.match(pattern);
      return {
        startBlock: `{${decorator}(`,
        replacement: current.replace(pattern, '$1$2').replace(/\(\s*,\s*/, '('),
        endBlock: ')}',
      };
    },
  },

  // for
  {
    pattern: /^(\s*)(.*)(@for='\s*([(]{0,1})\s*([^\s]+)\s*(,\s+([a-zA-Z0-9_]+)){0,1}\s*(,\s+([a-zA-Z0-9_]+)){0,1}\s*([)]{0,1})\s+in\s+([^\n]+?)\s*')/,
    process: (current, pattern) => {
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
  },

  // repeat
  {
    pattern: /^(\s*)(.*)(@repeat='\s*([^\n]+?)\s+as\s+([^\s]+)\s*(,\s+([a-zA-Z0-9_]+)){0,1}\s*')/,
    process: (current, pattern) => {
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
  },

  // if
  {
    pattern: /^(\s*)(.*)(@if='([^']+)')/,
    process: (current, pattern) => {
      const [,,,, condition] = current.match(pattern);
      return {
        startBlock: `{(${condition}) && (`,
        replacement: current.replace(pattern, '$1$2').replace(/\(\s*,\s*/, '('),
        endBlock: ')}',
      };
    },
  },

  // unless
  {
    pattern: /^(\s*)(.*)(@unless='([^']+)')/,
    process: (current, pattern) => {
      const [,,,, condition] = current.match(pattern);
      return {
        startBlock: `{!(${condition}) && (`,
        replacement: current.replace(pattern, '$1$2').replace(/\(\s*,\s*/, '('),
        endBlock: ')}',
      };
    },
  },

  // show
  {
    pattern: /^(\s*)(.*)(@show='([^']+)')/,
    process: (current, pattern) => ({
      replacement: current.replace(pattern, (whole, p1, p2, p3, p4) => `${p1 + p2}style='{{ display: (${p4.replace(/"/g, '"')} ? "" : "none") }}'`),
    }),
  },

  // hide
  {
    pattern: /^(\s*)(.*)(@hide='([^']+)')/,
    process: (current, pattern) => ({
      replacement: current.replace(pattern, (whole, p1, p2, p3, p4) => `${p1 + p2}style='{{ display: (${p4.replace(/"/g, '"')} ? "none" : "") }}'`),
    }),
  },
];

export default annotations;
