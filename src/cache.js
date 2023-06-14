const contentCache = {
  /* ID { id: 'string', type: 'string', name: 'string', description: 'shortened_string' } */
};

function fetchContent (id) {
  /* if contentCache or contentCache is promise, return */
  /* otherwise, create fetchRequest, set cache, and return */
}

function deferredFetch (url) {
  /* Adds fetch request to a queue, only allows 3 at a time. */
}

browser.runtime.onMessage.addListener((msg) => {
  switch (msg.type) {
  case 'cache':
    /* TODO don't overwrite existing fetch */
    contentCache[msg.content.id] = msg.content;
  }
});
