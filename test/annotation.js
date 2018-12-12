require('should');
const { pugToJsx } = require('..');
const { toTestArr } = require('./helper');

const tests = toTestArr(`
@NAME: @for

@INPUT:
ul
  li(@for='item in items') {item.name}
ul
  li(@for='(item, key) in items') {item.name}
ul
  li(@for='(item, key, index) in items') {item.name}

@EXPECTED:
<>
  <ul>
    {__macro.for(items).map((item, i) => (
      <li key={i}>{item.name}</li>
    ))}
  </ul>
  <ul>
    {__macro.for(items).map((item, key) => (
      <li key={key}>{item.name}</li>
    ))}
  </ul>
  <ul>
    {__macro.for(items).map((item, key, index) => (
      <li key={key}>{item.name}</li>
    ))}
  </ul>
</>


@NAME: @for (complex)

@INPUT:
div(@if='after.templates[0]')
  div(@for='(metric, key) in (allTemplates.filter(e => e.id === after.templates[0])[0] || {}).metrics')
    | {key} : {metric}

@EXPECTED:
{
  after.templates[0] && (
    <div>
      {__macro.for((allTemplates.filter(e => e.id === after.templates[0])[0] || {}).metrics).map((metric, key) => (
        <div key={key}>
          {key} : {metric}
        </div>
      ))}
    </div>
  )
}


@NAME: @repeat

@INPUT:
ul
  li(@repeat='items as item') {item}

@EXPECTED:
<ul>
  {(items || []).map((item, i) => (
    <li key={i}>{item}</li>
  ))}
</ul>


@NAME: @repeat (complex)

@INPUT:
ul
  li(@repeat='allTemplates.filter(e => e.id === after.templates[0])[0].examples as example') {example}

@EXPECTED:
<ul>
  {(allTemplates.filter(e => e.id === after.templates[0])[0].examples || []).map((example, i) => (
    <li key={i}>{example}</li>
  ))}
</ul>


@NAME: @repeat (preserve user-defined key)

@INPUT:
ul
  li(@repeat='items as item', otherAttr='', key='{item.id}') {item}

@EXPECTED:
<ul>
  {(items || []).map((item, i) => (
    <li otherAttr="" key={item.id}>
      {item}
    </li>
  ))}
</ul>


@NAME: @if, @unless, @show, @hide

@INPUT:
div
  span(@if='props.if') hello
  span(@unless='props.unless') unless
  span(@show='props.show') show
  span(@hide='props.hide') hide

@EXPECTED:
<div>
  {props.if && <span>hello</span>}
  {!props.unless && <span>unless</span>}
  <span style={{ display: props.show ? "" : "none" }}>show</span>
  <span style={{ display: props.hide ? "none" : "" }}>hide</span>
</div>


@NAME: using inequality symbols with @if, @unless, @show, @hide

@INPUT:
div
  span(@if='props.if < 1') hello
  span(@unless='props.unless > 2') unless
  span(@show='3 < show && show < 4') show
  span(@hide='4 <= hide && hide <= 5') hide

@EXPECTED:
<div>
  {props.if < 1 && <span>hello</span>}
  {!(props.unless > 2) && <span>unless</span>}
  <span style={{ display: 3 < show && show < 4 ? "" : "none" }}>show</span>
  <span style={{ display: 4 <= hide && hide <= 5 ? "none" : "" }}>hide</span>
</div>
`);

describe('annotaion', () => {
  tests.forEach(({ name, input, expected }) => {
    it(name, () => {
      const output = pugToJsx(input).code;
      output.should.be.eql(expected);
    });
  });
});
