const macro = `const __macro = {
  for: items => ({
    map: (mapFn) => {
      let mapFns = [];
      if (items && items['@@__IMMUTABLE_MAP__@@']) {
        items.mapEntries(([key, value], i) => {
          mapFns.push(mapFn(value, key, i));
        });
      } else if (items && items['@@__IMMUTABLE_LIST__@@']) {
        items.forEach((value, i) => {
          mapFns.push(mapFn(value, i, i));
        });
      } else if (Array.isArray(items)) {
        mapFns = items.map((value, index) => mapFn(value, index, index));
      } else {
        mapFns = Object.keys(items || []).map((key, index) => mapFn(items[key], key, index));
      }
      return mapFns;
    },
  }),
};
`;

export default {
  macro,
};
