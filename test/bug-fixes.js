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
  <i className={icons[name]}></i>
</a>


@NAME: className conflict 2

@INPUT:
a.nav-link(href='#', onClick='{this.handleClick}')          
  i(style='{{ marginRight: 8 }}', className='{icons[name]}')

@EXPECTED:
<a className="nav-link" href="#" onClick={this.handleClick}>
  <i style={{ marginRight: 8 }} className={icons[name]}></i>
</a>


@NAME: className conflict 3

@INPUT:
button.btn(className='{styles.btnAdAssets}' data-item-id='{item.id}')

@EXPECTED:
<button className={'btn ' + styles.btnAdAssets} data-item-id={item.id}></button>


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
></button>


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


@NAME: PascalCase className

@INPUT:
.SchemaForm(className='{schemaFormStyle}', ref='{wrapEl => this.wrapEl = wrapEl}')
  Container

@EXPECTED:
<div className={'SchemaForm ' + schemaFormStyle} ref={wrapEl => (this.wrapEl = wrapEl)}>
  <Container></Container>
</div>


@NAME: commented block

@INPUT:
div
  //- commented out
    .should-not-be-visible

    .should-not-be-visible

  //- commented out
  .should-be-visible

@EXPECTED:
<div>
  <div className="should-be-visible"></div>
</div>


@NAME: using space within an attr assignment

@INPUT:
input(type='text',
  readOnly= '{false}',
  disabled ='{false}',
  value='{value}')

@EXPECTED:
<input type="text" readOnly={false} disabled={false} value={value} />


@NAME: using a backslash at the end of a line

@INPUT:
p
  i.fa.fa-fw(className='{ \\
    (browser.name.search(/^ie$/i) !== -1 ? "fa-internet-explorer" : "") + \\
    (browser.name.search(/chrome/i) !== -1 ? "fa-chrome" : "") \\
  }')
  | {browser.name}

@EXPECTED:
<p>
  <i
    className={
      'fa fa-fw ' +
      ((browser.name.search(/^ie$/i) !== -1 ? 'fa-internet-explorer' : '') +
        (browser.name.search(/chrome/i) !== -1 ? 'fa-chrome' : ''))
    }
  ></i>
  {browser.name}
</p>


@NAME: capital letters in the first letter of the className

@INPUT:
.App
  header.App-header
    img.App-logo(src='{logo}', alt='logo')
    p
      | Edit&nbsp;
      code src/App.js
      | &nbsp;and save to reload.
    a.App-link(href='https://reactjs.org', target='_blank', rel='noopener noreferrer')
      | Learn React

@EXPECTED:
<div className="App">
  <header className="App-header">
    <img className="App-logo" src={logo} alt="logo" />
    <p>
      Edit&nbsp;<code>src/App.js</code>&nbsp;and save to reload.
    </p>
    <a className="App-link" href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
      Learn React
    </a>
  </header>
</div>

@NAME: function call in loop

@INPUT:
ul
  li(@for='func in funcs', data-name='{func()}')

@EXPECTED:
<ul>
  {__macro.for(funcs).map((func, i) => (
    <li key={i} data-name={func()}></li>
  ))}
</ul>

@NAME: boolean shorthand

@INPUT:
BrowserRouter
  Route(exact)
  Route(exact strict)
  Route(exact strict path=path)
  Route(path="/" exact strict)
  Route(exact path="/" component="{Home}")
  Route(path="/" exact component="{Home}")
  Route(path="/" component="{Home}" exact)
  Route(path="/" component="{Home}" exact="{true}")
  Route(path="/" component="{Home}" exact="{false}")
  Route(foo=('bar') bar=(baz === 'baz'))

@EXPECTED:
<BrowserRouter>
  <Route exact={true}></Route>
  <Route exact={true} strict={true}></Route>
  <Route exact={true} strict={true} path={path}></Route>
  <Route path="/" exact={true} strict={true}></Route>
  <Route exact={true} path="/" component={Home}></Route>
  <Route path="/" exact={true} component={Home}></Route>
  <Route path="/" component={Home} exact={true}></Route>
  <Route path="/" component={Home} exact={true}></Route>
  <Route path="/" component={Home} exact={false}></Route>
  <Route foo={'bar'} bar={baz === 'baz'}></Route>
</BrowserRouter>

@NAME: children as function

@INPUT:
div
  | {({ Form, Input }) => (
  Form
    Input
  | )}

@EXPECTED:
<div>
  {({ Form, Input }) => (
    <Form>
      <Input></Input>
    </Form>
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
