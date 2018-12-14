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
<div className={'root ' + styles.a}>
  <h1 className="greeting">hello world!</h1>
</div>
`);

describe('import', () => {
  tests.forEach(({ name, input, expected }) => {
    it(name, () => {
      const { jsx, imports } = pugToJsx(input);
      jsx.should.be.eql(expected);
      imports.length.should.be.eql(1);
      imports.map(e => e.name).should.containEql('styles');
    });
  });
});
