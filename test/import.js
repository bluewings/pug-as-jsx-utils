require('should');
const { pugToJsx } = require('..');
const { toTestArr } = require('./helper');

const tests = toTestArr(`
@NAME: @import css

@INPUT:
// @import .scss => styles
.root(className='{styles.a}')
  h1.greeting hello world!

@EXPECTED:
<div className={"root " + styles.a}>
  <h1 className="greeting">hello world!</h1>
</div>
`);

describe('import', () => {
  tests.forEach(({ name, input, expected }) => {
    it(name, () => {
      const output = pugToJsx(input).code;
      output.should.be.eql(expected);
    });
  });
});
