require('should');
const { pugToJsx } = require('..');
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
<div className="btn btn-default" abbr="interrupt"></div>


@NAME: use template-literal if possible

@INPUT:
ul.nav.nav-tabs(className='{"nav-tabs-" + tabs.length}')

@EXPECTED:
<ul className={'nav nav-tabs ' + ('nav-tabs-' + tabs.length)}></ul>


@NAME: line breaks when there are too many properties

@INPUT:
button.navbar-toggle(type='button', data-toggle='collapse', data-target='#navbar', aria-expanded='false', aria-controls='navbar')

@EXPECTED:
<button
  className="navbar-toggle"
  type="button"
  data-toggle="collapse"
  data-target="#navbar"
  aria-expanded="false"
  aria-controls="navbar"
></button>


@NAME: multi line options

@INPUT:
div(options='{{ \
  lineNum: true, \
  theme: "monokai" }}')

@EXPECTED:
<div options={{ lineNum: true, theme: 'monokai' }}></div>


@NAME: use jsx expression

@INPUT:
div
  WrappedComponent(id='wrap', __jsx='{...props}', data-attr='attr')

@EXPECTED:
<div>
  <WrappedComponent id="wrap" {...props} data-attr="attr"></WrappedComponent>
</div>


@NAME: use multiple jsx expressions

@INPUT:
div
  WrappedComponent(id='wrap', __jsx='{...props}', __jsx='{...otherProps}')

@EXPECTED:
<div>
  <WrappedComponent id="wrap" {...props} {...otherProps}></WrappedComponent>
</div>
`);

describe('simple', () => {
  tests.forEach(({ name, input, expected }) => {
    it(name, () => {
      const output = pugToJsx(input).jsx;
      output.should.be.eql(expected);
    });
  });
});
