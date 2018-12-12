
function toTestArr(b) {
  const { tests } = b.split(/\n/).reduce((prev, curr) => {
    let next = { ...prev };
    if (curr.search(/^@\s*NAME\s*:/) === 0) {
      const cursor = { name: curr.replace(/^@\s*NAME\s*:/g, '').trim(), input: [], expected: [] };
      next = { type: null, tests: [...next.tests, cursor], cursor };
    } else if (curr.search(/^@\s*INPUT\s*:/) === 0) {
      next = { ...next, type: 'input' };
    } else if (curr.search(/^@\s*EXPECTED\s*:/) === 0) {
      next = { ...next, type: 'expected' };
    } else if (next.type && Array.isArray(next.cursor[next.type])) {
      next.cursor[next.type] = [...next.cursor[next.type], curr];
    }
    return next;
  }, { type: null, tests: [], cursor: null });

  return tests.map(({ name, input, expected }) => ({
    name,
    input: input.join('\n').trim(),
    expected: expected.join('\n').trim(),
  }));
}

module.exports.toTestArr = toTestArr;
