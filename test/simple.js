require('should');
const pugAsJsx = require('..');
const { toTestArr } = require('./helper');

const tests = toTestArr(`
@NAME: basic conversion

@INPUT:
div
  h1.greeting hello world!

@EXPECTED:
<div>
  <h1 className="greeting">hello world!</h1>
</div>


@NAME: merge classNames

@INPUT:
.btn(abbr="interrupt", class="btn-default")

@EXPECTED:
<div className="btn btn-default" abbr="interrupt" />


@NAME: use template-literal if possible

@INPUT:
ul.nav.nav-tabs(className='{"nav-tabs-" + tabs.length}')

@EXPECTED:
<ul className={"nav nav-tabs " + ("nav-tabs-" + tabs.length)} />


@NAME: use jsx expression

@INPUT:
div
  WrappedComponent(id='wrap', __jsx='{...props}', data-attr='attr')

@EXPECTED:
<div>
  <WrappedComponent id="wrap" {...props} data-attr="attr" />
</div>


@NAME: use multiple jsx expressions

@INPUT:
div
  WrappedComponent(id='wrap', __jsx='{...props}', __jsx='{...otherProps}')

@EXPECTED:
<div>
  <WrappedComponent id="wrap" {...props} {...otherProps} />
</div>
`);

describe('simple', () => {
  tests.forEach(({ name, input, expected }) => {
    it(name, () => {
      const output = pugAsJsx(input).code;
      output.should.be.eql(expected);
    });
  });
});
