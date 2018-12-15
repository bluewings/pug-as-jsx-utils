require('should');
const { pugToJsx, removeIndent } = require('..');

describe('@import css', () => {
  it('@import css2', () => {
    const { jsx, imports, variables } = pugToJsx(`
    // @import .scss => styles
    .root(className='{styles.root}')
      h1.greeting hello world!
    `, { template: true });
    jsx.should.be.eql(removeIndent(`
    <div className={'root ' + styles.root}>
      <h1 className="greeting">hello world!</h1>
    </div>
    `));
    variables.length.should.be.eql(0);
    imports.length.should.be.eql(1);
    imports.map(e => e.name).should.containEql('styles');
  });

  it('resolve', () => {
    const input = `
    // @import .scss => styles
    .root(className='{cx(styles.root)}')
      Intl(id="greeting")
    `;
    const expected = removeIndent(`
    import React from 'react';
    import { FormattedMessage as Intl } from 'react-intl';
    import cx from 'classnames';
    import styles from '%BASENAME%.scss';
    
    export default function() {
      return (
        <div className={'root ' + cx(styles.root)}>
          <Intl id="greeting" />
        </div>
      );
    }
    `);
    const { jsxTemplate } = pugToJsx(input, {
      resolve: {
        classnames: 'cx',
        'react-intl': {
          member: { Intl: 'FormattedMessage' },
        },
      },
      template: true,
    });
    jsxTemplate.trim().should.be.eql(expected);
  });
});
