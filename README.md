# pug-as-jsx-utils

```js
const { pugToJsx } = require('pug-as-jsx-utils');

const result = pugToJsx(`
  div
    h1.greeting(onClick='{handleClick}')
      | Hello World, {name}!
`, { template: true });
```

```js
// result
{
  "jsx": "<div>\n  <h1 className=\"greeting\" onClick={handleClick}>\n    Hello World, {name}!\n  </h1>\n</div>",
  "imports": [],
  "useThis": false,
  "variables": [
    "handleClick",
    "name"
  ],
  "jsxTemplate": "import React from 'react';\n\nexport default function(__params = {}) {\n  const { handleClick, name } = __params;\n  return (\n    <div>\n      <h1 className=\"greeting\" onClick={handleClick}>\n        Hello World, {name}!\n      </h1>\n    </div>\n);\n}\n"
}

// result.jsx
<div>
  <h1 className="greeting" onClick={handleClick}>
    Hello World, {name}!
  </h1>
</div>

// result.jsxTemplate
import React from 'react';

export default function(__params = {}) {
  const { handleClick, name } = __params;
  return (
    <div>
      <h1 className="greeting" onClick={handleClick}>
        Hello World, {name}!
      </h1>
    </div>
  );
}
```
