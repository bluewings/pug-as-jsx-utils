require('should');
const { pugToJsx } = require('..');
const { toTestArr } = require('./helper');

const tests = toTestArr(`
@NAME: autofix role=button

@INPUT:
div(onClick='{handleClick}')
div(onClick='{handleClick}', role='link')
a(onClick='{handleClick}')
button(onClick='{handleClick}')

@EXPECTED:
<>
  <div onClick={handleClick} role='button'></div>
  <div onClick={handleClick} role="link"></div>
  <a onClick={handleClick}></a>
  <button onClick={handleClick}></button>
</>

`);

describe('autofix', () => {
  tests.forEach(({ name, input, expected }) => {
    it(name, () => {
      const output = pugToJsx(input, { autoFix: true }).jsx;
      output.should.be.eql(expected);
    });
  });
});
