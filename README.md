# pug-as-jsx-utils

```js
const { pugToJsx } = require('pug-as-jsx-utils');

const result = pugToJsx(`
  div
    h1.greeting(onClick='{handleClick}')
      | Hello World, {name}!
`, { analyze: true });

// result.jsx
<div>
  <h1 className="greeting" onClick={handleClick}>
    Hello World, {name}!
  </h1>
</div>

// result
{
  "jsx": "<div>\n  <h1 className=\"greeting\" onClick={handleClick}>\n    Hello World, {name}!\n  </h1>\n</div>",
  "imports": [],
  "useThis": false,
  "variables": [
    "handleClick",
    "name"
  ]
}
```
