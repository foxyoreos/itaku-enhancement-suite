import fixUnescapedAnds from "./listeners/tagSearchFix.js";
import includeBlocklistPreFilter from "./listeners/includeBlocklistPreFilter.js";
import blocklist from "./listeners/blocklist.js";
import reshares from "./listeners/reshares.js";
import feedFilter from "./listeners/feedFilter.js";
import comments from "./listeners/comments.js";

/* ------------------------------------------------------ */
/* --------------- CACHES/SETTINGS/CONSTANTS ------------ */
/* ------------------------------------------------------ */
/* The Itaku Extension Suite loads its background scripts using
 * persist: false. That means this script will regularly be discarded
 * and re-loaded; the data here is temporary and will often need to be
 * re-fetched from extension settings/front-end. */

const settings = {}; /* See `settings/settings.js` */

const user = { /* Stored in extension sessionStorage (this is pretty fragile, but probably fine) */
  id: null,
  username: null,
};

/* Stored purely locally, used to bootstrap sessionStorage for new tabs. */
const syncs = {
  contentCache: {},
}

/* Feed URLs that need to be checked for warnings. Add additional entry points here.
 * If the structure varries from typical response objects, add additional handling
 * code in "handleContentWarnings"
 *
 * TODO check for post previews when editing tags, they're likely not handled.
 * TODO check for animations, they might use a different key than "gallery_images" */
const CONTENT_FEEDS = {
  urls: [
    'https://itaku.ee/api/feed/?*', /* Both home feed and profile feed */
    'https://itaku.ee/api/posts/?*', /* Home "posts" tab */
    'https://itaku.ee/api/posts/*/', /* Posts with multiple images embedded within */
    'https://itaku.ee/api/galleries/images/?*', /* Home "images" tab and profile galleries */
    'https://itaku.ee/api/user_profiles/*/latest_content/', /* Recently starred/uploaded */
    'https://itaku.ee/api/galleries/images/user_starred_imgs/?*', /* starred images on profiles */
    'https://itaku.ee/api/submission_inbox/?*', /* Self explanatory... submission inbox. */

    /* These links are used more for direct fetch caching, rather than content warnings */
    'https://itaku.ee/api/*/comments/?*', /* Comment fetch */
    'https://itaku.ee/api/galleries/images/*/',

    /* These are used for URL fixes, but are generally harmless to run other logic on
     * since they follow the same basic structure as everything else. */
    'https://itaku.ee/api/tags/detailed/?*'
  ],
  types: ['xmlhttprequest']
};

/* Used to determine which user account we should be caching content for. Stored
 * only in sessionStorage to avoid any possible data leaks. */
const USER_CALLS = {
  urls: ['https://itaku.ee/api/auth/user/'],
  types: ['xmlhttprequest']
};

/* Reactive properties */
browser.storage.onChanged.addListener(async () => {
  const storageSettings = await browser.storage.sync.get();
  Object.assign(settings, storageSettings);
});

/* Persist settings and cache (TODO we should watch out for race conditions with "load" here) */
async function save () {
  browser.storage.sync.set(settings);
  sessionStorage.setItem('ItakuEnhancedUserMeta', JSON.stringify(user));
}

async function load () {
  const storageSettings = await browser.storage.sync.get();
  Object.assign(settings, storageSettings);

  settings.positive_regexes = settings.positive_regexes || [];
  settings.negative_regexes = settings.negative_regexes || [];
  settings.tag_warnings = settings.tag_warnings || [];
  const userObj = JSON.parse(sessionStorage.getItem('ItakuEnhancedUserMeta')) || {};
  user.id = userObj.id;
  user.username = userObj.username;
}

browser.storage.onChanged.addListener(() => {
  load();
});

/* ------------------------------------------------------ */
/* --------------------- ENTRY LOGIC -------------------- */
/* ------------------------------------------------------ */
/* How the extension is wired up and initialized, request handlers attached, and
 * errors handled. */

/* Events need to be top-level to work with non-persistant background scriptsa.
 * This complicates logic somewhat, but what can you do? */
let onMessageHandler;
browser.runtime.onMessage.addListener((evt, sender, response) => {
  if (onMessageHandler) { return onMessageHandler(evt, sender, response); }
});

async function get_script(url) {
  const internal_path = browser.runtime.getURL(`src/clientside/${url}`);
  const request = await fetch(internal_path);
  const text = await request.text();
  return text;
}

let contentRequestMiddleware = loadBlockingHandler;
browser.webRequest.onBeforeRequest.addListener((details) => {
  if (contentRequestMiddleware) { return contentRequestMiddleware(details); }
  return {};
}, CONTENT_FEEDS, ['blocking']);

async function init () {
  try {
    await load();
    save(); /* After loading new default settings, save them. */

    /* Receive communication from the front-end (mostly used for setting/fetching settings) */
    onMessageHandler = (evt, sender, response) => {
      switch (evt.type) {
      case 'get_user':
        response({ type: 'response', content: user });
        break;
      case 'get_script':
        get_script(evt.content.url).then((result) => {
          response({ type: 'response', content: result });
        });
        return true;
      case 'sync':

        /* Note that this still doesn't guarantee that session data will be
         * shared between every tab. But it should reduce the number of
         * occurances at least. */
        const missing =
          Object.keys(syncs.contentCache)
          .reduce((result, key) => {
            if (evt.content[key]) { return result; }
            result.push(syncs.contentCache[key]);
            return result;
          }, []);

        syncs.contentCache = { ...syncs.contentCache, ...evt.content };
        response({ type: 'response', content: missing });
        break;
      }
    };

  } catch (err) { /* Abandon setup */
    console.log('HEY!!! Report this to foxyoreos on Itaku or on https://codeberg.org/foxyoreos/itaku-enhancement-suite >:3');
    console.log('If (and only if) you feel comfortable sharing your CW regexes, they may be helpful to include.');
    console.log('Load failed with error: ', err);
    return Promise.reject(err);
  }
}

/* We want to wait for initialization to finish before responding to any
 * requests. However, we also want to fail gracefully if initialization blows up
 * and the extension can't load. The solution is a blocking handler that removes
 * itself regardless of whether or not initialization happened correctly and
 * attaches the correct handler/call if everything went OK. */
const loading = init();
let attached = false;
function loadBlockingHandler (details) {
  console.log('Blocking handler started');

  return loading
    .then(() => {

      /* In the rare case that two requests are fired off before init is done. */
      if (attached) { return handleContentObject(details); }
      contentRequestMiddleware = handleContentObject;
      attached = true;

      console.log('Attached middleware and removed blocking handler.');
      return handleContentObject(details);

    }).then(
      (result) => result, /* Everything went fine */
      () => { /* Oops, somewhere along the line we errored out, sowwy ;w; */

        console.log('Initial load failed, detaching backend scripts.');
        console.log('You may notice errors since I haven\'t added error handling to the UI-side changes yet.');
        contentRequestMiddleware = null;
        return {};
      });
}

/* Messaging with notification component */
let ports = [];
browser.runtime.onConnect.addListener((port) => {
  ports.push(port);
  port.onDisconnect.addListener(()=>{
    const index = ports.indexOf(port);
    ports.splice(index, 1);
  });
});

/* And finally, the last of the handler setup for user fetch. Nothing fancy needs to happen here. */
browser.webRequest.onBeforeRequest.addListener((details) => {
  /* Little bit frustrating that we can't just wait for the request to finish
   * and look at the body. This method should likely be simplified a bit. */
  let filter = browser.webRequest.filterResponseData(details.requestId);
  let decoder = new TextDecoder('utf-8');
  let str = '';
  filter.ondata = (e) => {
    str += decoder.decode(e.data, { stream: true });
    filter.write(e.data);
  }

  filter.onstop = (e) => {
    const json = JSON.parse(str);
    user.username = json?.profile?.owner_username;
    user.id = json?.profile?.owner;

    /* Used for filtering blacklisted users in strict mode. Convert to an
     * object hash so that it's easier to reference performantly. */
    user.blacklisted_users = (json?.meta?.blacklisted_users || []).reduce((result, id) => {
      result[id] = true;
      return result;
    }, {});

    /* Used for filtering blacklisted users in strict mode. Convert to an
     * object hash so that it's easier to reference performantly. */
    user.blacklisted_tags = (json?.meta?.blacklisted_tags || []).reduce((result, tag) => {
      result[tag.name] = tag;
      if (tag.synonymous_to) {
        result[tag.synonymous_to.name] = tag.synonymous_to;
      }

      return result;
    }, {});

    console.log(user);

    /* Set submission mute based on the user preferences for the entire site,
     * rather than separating them into a separate setting. */
    (() => {
      if (!json.meta) { return null; }
      settings.__INLINE__mute_submission_notifs = json.meta.mute_submission_notifs;
      save();
    })();

    sessionStorage.setItem('ItakuEnhancedUserMeta', JSON.stringify(user));
    console.log('Caching for user: ', user);
    filter.close();
  }
}, USER_CALLS, ['blocking']);


/* ------------------------------------------------------ */
/* ------------------ EXTENSION LOGIC ------------------- */
/* ------------------------------------------------------ */
/* The actual code that's doing stuff. */

/* Cache updates. We only cache content that belongs to the user since that's
 * the only content that will be referenced in the notifications drawer. */
function cacheContentObject(result) {
  if (!user.id) { return; }
  if (user.id !== result.owner) { return; }

  /* Handle both comments and images/posts */
  const description = result.description || result.content || '';
  const truncatedDescription = description.slice(0, 250) +
        (description.length > 250 ? '...' : '');

  /* We don't check to see if a title/description exists
   * because even if they don't, we still want to mark that
   * content as fetched so the front-end doesn't try to re-fetch
   * it a second time. */
  syncs.contentCache[result.id] = {
    loading: false,
    id: result.id,
    title: result.title,
    description: truncatedDescription,
  };

  ports.forEach((port) => {
    port.postMessage({
      type: 'cache',
      content: [syncs.contentCache[result.id]],
    });
  });
}

/* Different object types on Itaku are embedded within each other. It's often
 * necessary to repeatedly recurse into objects to get at everything that can
 * have a content warning attached. */
function recurseContentObject (obj) {
  if (!obj) { return; }
  const child_fields = [
    'results',
    'latest_gallery_images',
    'recently_liked_images',
    'embedded_images',

    /* For profiles */
    'pinned_item',

    /* Normal recursion */
    'gallery_images',

    /* Handle reposts, which are treated as their own objects */
    'content_object',
  ];


  cacheContentObject(obj);

  /* For simplicity's sake, we treat child objects that are not arrays as if they were
   * arrays. This greatly reduces complexity for filters that want to iterate over children.
   * Do handle this, we convert each object to an array and then convert back before
   * returning the final object. There is a caveat: if you write multiple objects to an
   * array for `pinned_item`, we're only going to take the first object when converting back. */
  let temp_arrays = []; /* Explained more below. */

  /* Start by recursing down to the children and running filters on them. */
  child_fields.forEach((field) => {
    if (!obj[field]) { return; }

    /* Array conversion (see above) */
    if (obj[field].constructor !== Array) {
      temp_arrays.push(field);
      obj[field] = [obj[field]];
    }

    const children = obj[field];
    let result = children.reduce((result, child) => {
      child = recurseContentObject(child);

      /* Return null from a filter script to remove the child/object from its parent. */
      if (child != null) {
        result.push(child);
      }
      return result;
    }, []);

    obj[field] = result || undefined;
  });

  /* Okay, we've finished recursing, now we need to handle ourselves. */
  const response = contentFilters.reduce((result, filter) => {
    if (result) { /* If a filter returns null, no need to call the remaining filters. */
      result = filter(obj, settings, child_fields, user);
    }

    return result;
  }, obj);

  /* Rewrite the response to get rid of the fake arrays (see notes on temp_arrays) */
  temp_arrays.forEach((field) => {
    if (response[field]) {
      response[field] = response[field].length ? response[field][0] : undefined;
    }
  });

  /* TODO: It's possible for the above operation to leave the parent in a broken state. */
  /* Should we filter out parents that have no valid children attached to them? */
  /* For now, no becase we'll just make this into a dependent setting. */

  /* Handle comment requests (note that we don't need to check these for content
   * warnings though, only to cache) */
  if (response.children) {
    response.children.forEach(
      (child) => {
        cacheContentObject(child);
      });
  }

  /* And return. */
  return response;
}

/* Called before the request has finished, useful for fixing query params
 * or redirecting requests, or serving cached content. */
const preFilters = [
  fixUnescapedAnds,
  includeBlocklistPreFilter,
  comments,
];

/* Called on the global response JSON object, useful for doing arbitrary
 * manipulations. */
const responseFilters = [
  feedFilter,
  reshares,
];

/* Most commonly called filters, called recursively for each content object
 * in the response starting from the bottom. Allows bubbling information from
 * nested content objects to their parents. */
const contentFilters = [
  blocklist,
];

/* Entry point for most "backend" logic:
 * - check content warnings and modify requests to deal with them.
 * - save content name/IDs in cache for use with notifications.
 * - moar stuff in the future too :3
 *
 * This is all mostly handled by calling into other functions (see above) */
function handleContentObject (details) {
  if (details.method !== 'GET') {
    return details;
  }

  /* Redirects and URL fixes that can happen before we ever start
   * parsing URLs. */
  let blockingResponse = preFilters.reduce((result, filter) => {
    return filter(details, result, settings);
  }, {});


  /* Set up event listeners for content filtering */
  /* TODO Check if we need a return above, we don't want to call this logic twice. */
  let filter = browser.webRequest.filterResponseData(details.requestId);
  let decoder = new TextDecoder('utf-8');
  let encoder = new TextEncoder();

  let str = '';
  filter.ondata = (e) => {
    str += decoder.decode(e.data, { stream: true });
  };

  filter.onstop = (e) => {
    let json = JSON.parse(str);

    const response = responseFilters.reduce((result, filter) => {
      return filter(details, result, settings, user);
    }, json);

    /* TODO there could be better checks here to see which are applicable. */
    recurseContentObject(response.page || response); /* Check itself (for direct posts) */
    filter.write(encoder.encode(JSON.stringify(response)));
    filter.close();
  }

  return blockingResponse;
}
