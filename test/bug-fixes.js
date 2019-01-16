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


@NAME: commented annotations

@INPUT:
div
  div(@for='(error, key, i) in errors')
    hr(@if='i > 0')
    div {error.keyword}
    a(@for='item in error.items', href='') {item.dataPath}
    //- span(@for='item in error.items')
      a(className='{styles.item}', href='', onClick='{handleClick.bind(this, item.jsonPath)}')

@EXPECTED:
<div>
  {__macro.for(errors).map((error, key, i) => (
    <div key={key}>
      {i > 0 && <hr />}
      <div>{error.keyword}</div>
      {__macro.for(error.items).map((item, i) => (
        <a key={i} href="">
          {item.dataPath}
        </a>
      ))}
    </div>
  ))}
</div>


@NAME: duplicate attribute

@INPUT:
div
  Item(@for='(item, key, i) in items',
    key='{item._key}')
    h1.greeting Hello World

@EXPECTED:
<div>
  {__macro.for(items).map((item, key, i) => (
    <Item key={item._key}>
      <h1 className="greeting">Hello World</h1>
    </Item>
  ))}
</div>


@NAME: multi-line contents

@INPUT:
h6.modal-title
  Fragment(@if='mutation')
    | {intl('common.message.handleEntity', {
    |   mutation: intl("common.mutationType." + mutation),
    |   entity: intl("common.term." + entity),
    |   name: data && data.name,
    | })}

@EXPECTED:
<h6 className="modal-title">
  {mutation && (
    <Fragment>
      {intl('common.message.handleEntity', {
        mutation: intl('common.mutationType.' + mutation),
        entity: intl('common.term.' + entity),
        name: data && data.name
      })}
    </Fragment>
  )}
</h6>


@NAME: annotation w\\ double quotes

@INPUT:
div
  div.media-body(@if="displayName")
    span.mt-0 { displayName }

@EXPECTED:
<div>
  {displayName && (
    <div className="media-body">
      <span className="mt-0">{displayName}</span>
    </div>
  )}
</div>
`);

describe('bug-fixes', () => {
  tests.forEach(({ name, input, expected }) => {
    it(name, () => {
      const output = pugToJsx(input).jsx;
      output.should.be.eql(expected);
    });
  });
});
