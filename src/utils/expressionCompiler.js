
// -------------------------------------------------
// ---------------- TEXT TOKENS --------------------
// -------------------------------------------------

const operators = {
  AND: '&',
  OR: '|',
  NOT: '!',
};

const operator_lookup = Object.keys(operators).reduce((result, key) => {
  let value = operators[key];
  result[value] = key;
  return result;
}, {});

const name_types = {
  TAG: ['tag:', '#'],
  ARTIST: ['owner', '@'],
  RATING: ['rating:'],

  /* other indicators? */
  /* has_warning */
  /* date_before */
  /* date_after */
  /* starred */
};

const name_lookup = Object.keys(name_types).reduce((result, key) => {
  let value = name_types[key];
  value.forEach((ref) => {
    result[ref] = key;
  });
  return result;
}, {});

const grouping = {
  GROUP_START: '(',
  GROUP_END: ')',
  SPLIT: ' ',
};

const grouping_lookup = Object.keys(grouping).reduce((result, key) => {
  let value = grouping[key];
  result[value] = key;
  return result;
}, {});

/* Hacky solution for now. */
const group_ends = {
  ')': 'GROUP_END',
  ' ': 'SPLIT',
};

const lookup = {
  ...operator_lookup,
  ...name_lookup,
  ...grouping_lookup,
};

// -------------------------------------------------
// ---------------- HANDLERS -----------------------
// -------------------------------------------------

export function resolver (node, handler = () => true) {
  if (name_types[node.type]) {
    return handler(node.type, node.value);
  }

  switch (node.type) {
  case 'ROOT': return resolver(node.conditions[0], handler);
  case 'AND': return resolver(node.conditions[0], handler) && resolver(node.conditions[1], handler);
  case 'OR': return resolver(node.conditions[0], handler) || resolver(node.conditions[1], handler);
  case 'NOT': return !resolver(node.conditions[0], handler);
  case 'GROUP': return resolver(node.conditions[0], handler);
  }
}


// -------------------------------------------------
// ---------------- PARSERS ------------------------
// -------------------------------------------------

export function get_next_token(str, index, reference=false, current='') {
  if (index >= str.length) {
    return [current, -1, false];
  }

  const char_lookup = lookup[str[index]];
  if (char_lookup === 'ESCAPE_NEXT_CHAR') {
    if (str.length < index + 1) {
      throw new Error('Expected character to escape after escape symbol (\\). Escape symbol should not be end of line.');
    }

    current = current + str[index + 1];
    index = index + 2;
    return get_next_token(str, index, reference, current);
  }

  /* We've finished a reference token */
  if (reference && char_lookup && grouping[char_lookup]) {
    /* Note that we don't advance the index, we want to
     * have the reference stay the same so we can parse
     * whatever the separator actually is */
    return [current, index, false];
  }

  /* Okay, we got the immediate character checks out of the way, let's build a larger string */
  current = current + str[index];
  index = index + 1;

  /* We haven't exited a reference, but we also haven't reached the end, then don't check for anything else. */
  if (reference) {
    return get_next_token(str, index, reference, current);
  }


  /* Now we can check for other types: operators, name_types, and groups */
  if (lookup[current]) {
    return [lookup[current], index, !!name_lookup[current]];
  }

  /* Final catch-all. */
  return get_next_token(str, index, reference, current);
}


export function build_expression_tree(str) {
  let index = 0;
  let reference = false;
  let node_path = [{ type: 'ROOT', conditions: [] }];

  while (index !== -1) {
    let current_node = node_path[node_path.length - 1];
    let expecting_reference = reference;
    let next = get_next_token(str, index, reference);
    [,index,reference] = next;

    /* Attach reference to current node and pop */
    if (expecting_reference) {
      if (!current_node) { throw new Error(`Reference type must be identified: ${next[0]}`); }
      current_node.value = next[0];
      continue;
    }

    /* We can always pop if we're "done" with a node */

    /* Blegh... */
    switch (next[0]) {
    case 'GROUP_START':
      node_path.push({
        type: 'GROUP',
        conditions: [],
      });

      if (current_node && current_node.conditions) {
        current_node.conditions.push(node_path[node_path.length - 1]);
      }
      continue;
    case 'GROUP_END':
      /* reverse parse, popping until you reach a group. */
      while(current_node && current_node.type !== 'GROUP') {
        node_path.pop();
        current_node = node_path[node_path.length - 1];
      }

      continue;

      /* Needs to "hoist" the previous node.
       * The hacky way to do this is just to replace in place. */
    case 'AND':
      if (!current_node) {
        throw new Error(`Expected reference or expression before &`)
      }

      Object.assign(current_node, {
        type: 'AND',
        conditions: [{
          ...current_node
        }],
      });

      delete current_node.value;
      continue;
    case 'OR':
      if (!current_node) {
        throw new Error(`Expected reference or expression before |`)
      }

      Object.assign(current_node, {
        type: 'OR',
        conditions: [{
          ...current_node
        }],
      });

      delete current_node.value;
      continue;
    case 'NOT':
      node_path.push({
        type: 'NOT',
        conditions: []
      });

      if (current_node && current_node.conditions) {
        current_node.conditions.push(node_path[node_path.length - 1]);
      }
      continue;

    case 'TAG':
    case 'ARTIST':
    case 'RATING':
      node_path.push({
        type: next[0],
        value: null,
      });

      if (current_node && current_node.conditions) {
        current_node.conditions.push(node_path[node_path.length - 1]);
      }
      continue;

    case 'SPLIT': /* should be safe to just ignore? */
    default:
      continue;
    }
  }

  return node_path[0];
}
