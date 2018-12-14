require('should');
const { pugToJsx } = require('..');
const { toTestArr } = require('./helper');

const tests = toTestArr(`
@NAME: preserve the order of childnodes #1

@INPUT:
pre {state.start} ~ {state.end}

@EXPECTED:
<pre>
  {state.start} ~ {state.end}
</pre>


@NAME: preserve the order of childnodes #2

@INPUT:
pre {state.start} {state.end}

@EXPECTED:
<pre>
  {state.start} {state.end}
</pre>


@NAME: preserve the order of childnodes #3

@INPUT:
pre from {state.start}
  |  to {state.end}

@EXPECTED:
<pre>
  from {state.start} to {state.end}
</pre>


@NAME: sub components usage

@INPUT:
Modal
  Modal.Header
    Modal.Title { header }
  Modal.Body { body }

@EXPECTED:
<Modal>
  <Modal.Header>
    <Modal.Title>{header}</Modal.Title>
  </Modal.Header>
  <Modal.Body>{body}</Modal.Body>
</Modal>


@NAME: className conflict 1

@INPUT:
a.nav-link
  i(className='{icons[name]}')

@EXPECTED:
<a className="nav-link">
  <i className={icons[name]} />
</a>


@NAME: className conflict 2

@INPUT:
a.nav-link(href='#', onClick='{this.handleClick}')          
  i(style='{{ marginRight: 8 }}', className='{icons[name]}')

@EXPECTED:
<a className="nav-link" href="#" onClick={this.handleClick}>
  <i style={{ marginRight: 8 }} className={icons[name]} />
</a>


@NAME: className conflict 3

@INPUT:
button.btn(className='{styles.btnAdAssets}' data-item-id='{item.id}')

@EXPECTED:
<button className={'btn ' + styles.btnAdAssets} data-item-id={item.id} />


@NAME: className conflict 4

@INPUT:
button.btn.btn-default(type='button',
  className='{classNames(styles.btnApply, { "btn-active": refValue && refValue !== fieldValue })}',
  disabled='{!refValue || refValue === fieldValue}',
  onClick='{this.handleSyncClick}')

@EXPECTED:
<button
  className={'btn btn-default ' + classNames(styles.btnApply, { 'btn-active': refValue && refValue !== fieldValue })}
  type="button"
  disabled={!refValue || refValue === fieldValue}
  onClick={this.handleSyncClick}
/>
`);

describe('bug-fixes', () => {
  tests.forEach(({ name, input, expected }) => {
    it(name, () => {
      const output = pugToJsx(input).jsx;
      output.should.be.eql(expected);
    });
  });
});
