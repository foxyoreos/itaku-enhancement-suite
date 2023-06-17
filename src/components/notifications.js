(function () {

  /* ---------------------------------------- */
  /* ------------- SETUP/CACHES ------------- */
  /* ---------------------------------------- */

  const contentCache = JSON.parse(
    sessionStorage.getItem('ItakuEnhancedContentCache')) || {};

  function saveContentCache () {
    sessionStorage.setItem('ItakuEnhancedContentCache', JSON.stringify(contentCache));
  }

  const port = browser.runtime.connect({ name: 'notifications-port' });
  port.onMessage.addListener((evt, sender, response) => {
    console.log('got message');
    switch (evt.type) {
    case 'cache':
      evt.content.forEach((item) => {
        contentCache[item.id] = item;
      });

      saveContentCache();

      /* Update UI (if possible). Try to be Reactive about things. */
      extendNotifications(notificationsSubContainer);

      break;
    }
  });

  /* ------------------------------------------- */
  /* ------------ COMPONENT LOGIC -------------- */
  /* ------------------------------------------- */

  let fetches = {};
  let fetchQueue = [];
  let currentFetches = 0;
  const MAX_FETCHES = 1;
  /* We don't want to overwhelm the backend with fetches. To help
   * avoid that problem, we only allow a limited number of fetches at a time. The rest
   * are queued up in the background and wait for their turn. Itaku's API for this
   * kind of thing is pretty fast, so I've purposefully set the limit to be very
   * low (1) because I don't think it'll slow down the extension much, and
   * that allows us to have even more breathing room. We also enforce a
   * delay on new requests because... why not? It just slows things
   * down a little bit more and give a little more breathing room. */
  function runFetchQueue () {
    if (fetchQueue.length === 0) { return; }
    if (currentFetches > MAX_FETCHES) {
      console.log('Deferring fetch, queue full...');
      return;
    }

    currentFetches++;
    const next = fetchQueue.shift();
    next().then(() => {
      setTimeout(() => {
        --currentFetches;
        if (currentFetches < MAX_FETCHES) {
          runFetchQueue();
        }
      }, 200);

    }, () => {
        setTimeout(() => {
          --currentFetches;
          if (currentFetches < MAX_FETCHES) {
            runFetchQueue();
          }
        }, 200);
    });

  }

  function fetchResources (type, id, commentId) {
    const cacheId = commentId || id;

    /* Where do we need to fetch? */
    const url = (() => {
      switch (type) {
      case 'images':
        return commentId ?
          `/api/galleries/images/${id}/comments/?&page=1&page_size=30&child_page_size=100` :
          `/api/galleries/images/${id}/`;

      case 'posts':
        return commentId ?
          `/api/posts/${id}/comments/?&page=1&page_size=30&child_page_size=100` :
          `/api/posts/${id}/`;
      }
    })();


    /* Are we already fetching this? If so, we're not going to duplicate the
     * request. Note that fetching multiple comments under the same post should
     * only trigger one fetch, because we get all of the comments for that post
     * as a batch operation. */
    if (fetches[url]) {
      console.log(`Skipping fetch for ${id} (fetch already in progress)`)
      return;
    }

    /* Create the fetch request, set it, and queue it up. */
    fetches[url] = (async () => {

      /* I'm a little bit amazed that I don't need to do more here. Fetching
       * the url will route through the backend, which will automatically update
       * the cache once it's finished. The UI will get notified of cache updates
       * automatically and we refresh the UI when that happens. So just making
       * the request is enough. */
      console.log('fetching info for: ', url);
      const response = await fetch(`https://itaku.ee${url}`);
      console.log(url, 'response recieved');
    });

    /* Start request. */
    fetchQueue.push(fetches[url]);
    runFetchQueue();
  }

  /* DOM manipulation. */
  function extendNotifications (notifications) {
    if (!notifications) { return; } /* We haven't been attached yet. */

    const targets = notifications.querySelectorAll('a.notif-wrapper');
    targets.forEach((target) => {
      const urlInfo = (() => { /* Actual id + the id we would need to fetch */
        const url = new URL(target.href);
        const segments = (url.pathname + url.search).split('/').slice(1); /* drop preceding "/" */
        const finalSegment = segments[segments.length - 1];
        const ids = finalSegment.split('=');

        if (ids.length > 1) { ids[0] = ids[0].split('?')[0]; }
        return [segments[0], ...ids];
      })();

      /* The actual content id */
      const type = urlInfo[0];
      const id = urlInfo[urlInfo.length - 1];

      /* Follows don't need to be changed. */
      if (type === 'profile') { return; }

      /* If it's not already cached, queue a fetch. We also do a
       * mildly fragile check to see if this is for a comment, since
       * those are separate API requests and they can be attached
       * to images/posts that the user doesn't own. */
      let cache = contentCache[id];
      if (!cache || cache.loading) {
        fetchResources(type, urlInfo[1], urlInfo[2]);
        cache = { id: id, loading: true, };
      }

      /* If it's cached, but there is no description/title, then nothing we can do. */
      if (!cache.title && !cache.description) {
        return;
      }

      const label = target.querySelector('.mat-hint');
      label.setAttribute('data-itakuenhanced-processed', "true");
      label.innerText = cache.title || cache.description;
      // label.innerText = label.innerText + ': Replaced description via extension.';
    });
  }

  /* Actual notifications observation logic. */
  let notificationsContainer;
  let notificationsSubContainer;
  let debouncing = null;
  const notificationsObserver = new MutationObserver((list, observer) => {
    /* Throttle to avoid unnecessary changes */
    const ignore = list.reduce((result, mutation) => {
      if (mutation.type === 'attributes' &&
          mutation.attributeName === 'data-itakuenhanced-processed' &&
          mutation.target.attributes['data-itakuenhanced-processed'].value === "true") {

        return result && true;
      }

      if (mutation.type === 'childList' &&
          mutation.target !== notificationsSubContainer &&
          mutation.target !== notificationsContainer) {
        return result && true;
      }

      return false;
    }, true);

    if (ignore) { return; }

    /* There are a lot of things that call this method like its candy,
     * so we want to basically just make sure its not over-eager to fill
     * up the call stack. */
    if (!debouncing) {
      debouncing = true;
      setTimeout(() => {

        /* handle mutations, refresh references. Yes, this is annoying but we have to do it
         * because of how we're handling observers... Maybe there's a better way,  I don't know.
         * I'll think about it for future releases. */
        const currentNotificationsSubContainer = notificationsContainer.querySelector('.notification-menu');
        if (currentNotificationsSubContainer !== notificationsSubContainer) {
          notificationsObserver.disconnect();
          notificationsSubContainer = currentNotificationsSubContainer;
          if (notificationsContainer) {
            notificationsObserver.observe(notificationsContainer, { childList: true });
          }

          if (notificationsSubContainer) {
            notificationsObserver.observe(notificationsSubContainer, {
              attributeFilter: ["data-itakuenhanced-processed"],
              // characterData: true,
              attributes: true,
              childList: true,
              subtree: true,
            });
          }
        }

        // console.log('triggered notifications hooks (debounced)');
        extendNotifications(notificationsSubContainer);
        debouncing = false;
      }, 100);
    }
  });

  /* Parent logic to avoid slowing down the page. */
  let popup;
  const parentObserver = new MutationObserver((list, observer) => {

    /* If anything has changed, disconnect the existing observer */
    const currentNotificationsContainer = popup.querySelector('app-notifications');
    const currentNotificationsSubContainer = popup.querySelector('app-notifications .notification-menu');

    if (currentNotificationsContainer !== notificationsContainer || /* Hidden */
        currentNotificationsSubContainer !== notificationsSubContainer) {

      notificationsObserver.disconnect();

      /* And attempt to reconnect */
      notificationsContainer = currentNotificationsContainer;
      notificationsSubContainer = currentNotificationsSubContainer;
      if (notificationsContainer) {
        notificationsObserver.observe(notificationsContainer, { childList: true });
      }

      if (notificationsSubContainer) {
        notificationsObserver.observe(notificationsSubContainer, {
          attributeFilter: ["data-itakuenhanced-processed"],
          // characterData: true,
          attributes: true,
          childList: true,
          subtree: true,
        });
      }

      /* Try to run a replacement, see what happens. */
      extendNotifications(notificationsSubContainer);
    }

  });

  /* Wait for the entire app to load before we start attaching
   * scripts to things. */
  const appObserver = new MutationObserver(() => {
    popup = document.querySelector('.cdk-overlay-container');
    if (!popup) { return; }

    parentObserver.observe(popup, { childList: true });
    appObserver.disconnect();
  });
  appObserver.observe(document.body, { childList: true });
})();
