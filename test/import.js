require('should');
const { pugToJsx, removeIndent } = require('..');

describe('@import css', () => {
  it('@import css2', () => {
    const { jsx, imports, variables } = pugToJsx(`
    // @import .scss => styles
    .root(className='{styles.a}')
      h1.greeting hello world!
    `, { template: true });
    jsx.should.be.eql(removeIndent(`
    <div className={'root ' + styles.a}>
      <h1 className="greeting">hello world!</h1>
    </div>
    `));
    variables.length.should.be.eql(0);
    imports.length.should.be.eql(1);
    imports.map(e => e.name).should.containEql('styles');
  });
});
