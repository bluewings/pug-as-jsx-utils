require('should');
const { pugToJsx } = require('..');

describe('variables and components', () => {
  it('simple extract', () => {
    const { variables } = pugToJsx(`
    li(@repeat='items as item')
      ItemDetail(item='{item}')
    `, { analyze: true });
    variables.length.should.be.eql(2);
    variables.should.containEql('items');
    variables.should.containEql('ItemDetail');
  });

  it('ignore reserved keyword: React, this', () => {
    const { variables } = pugToJsx(`
    div
      | {React.Children.only(this.props.children)}
    `, { analyze: true });
    variables.length.should.be.eql(0);
  });

  it('fat arrow function /w concise syntax #1', () => {
    const { variables } = pugToJsx("input(type='text', ref='{(input) => this.textInput = input}')", { analyze: true });
    variables.length.should.be.eql(0);
  });

  it('fat arrow function /w concise syntax #2', () => {
    const { variables } = pugToJsx("input(type='text', ref='{input => this.textInput = input}')", { analyze: true });
    variables.length.should.be.eql(0);
  });

  it('ignore object key', () => {
    const { variables } = pugToJsx('CodeMirror(options=\'{{ mode: "yaml", styleActiveLine: true, lineNumbers: lineNum, lineWrapping: true, theme: "monokai" }}\')', { analyze: true });
    variables.length.should.be.eql(2);
    variables.should.containEql('CodeMirror');
    variables.should.containEql('lineNum');
  });

  it('ignore object key', () => {
    const { variables } = pugToJsx(`
    div
      ChildComponent(@if='ChildComponent')
      div(@if='!ChildComponent')
        h1 has no child
    `, { analyze: true });
    // variables count === 0
    variables.filter(e => e.search(/^[^A-Z]/) === 0).length.should.be.eql(0);
    // components count === 1
    variables.filter(e => e.search(/^[A-Z]/) === 0).length.should.be.eql(1);
  });
});
