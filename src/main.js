
const settings = {
  positive_regexes: [],
  negative_regexes: [],
};

/* TODO: this needs to be handled better to avoid race conditions */
async function getSettings () {
  settings.positive_regexes = (await browser.storage.sync.get('positive_regexes')).positive_regexes || [];
  settings.negative_regexes = (await browser.storage.sync.get('negative_regexes')).negative_regexes || [];
}

function saveSettings () {
  browser.storage.sync.set(settings);
}

/* Set up browser messages */
getSettings();
browser.runtime.onMessage.addListener((evt, sender, response) => {
  switch (evt.type) {
  case 'set_positive_regexes':
    settings.positive_regexes = evt.content;
    saveSettings();
    break;
  case 'set_negative_regexes':
    settings.negative_regexes = evt.content;
    saveSettings();
    break;
  case 'get_settings':
    response({ type: 'response', content: settings });
  }
});

/* Feed URLs that need to be checked for warnings. Add additional entry points here.
 * If the structure varries from typical response objects, add additional handling
 * code in "handleContentWarnings"
 *
 * TODO check for post previews when editing tags, they're likely not handled.
 * TODO check for animations, they might use a different key than "gallery_images" */
const contentFeeds = {
  urls: [
    'https://itaku.ee/api/feed/?*', /* Both home feed and profile feed */
    'https://itaku.ee/api/posts/?*', /* Home "posts" tab */
    'https://itaku.ee/api/galleries/images/?*', /* Home "images" tab and profile galleries */
    'https://itaku.ee/api/user_profiles/*/latest_content/', /* Recently starred/uploaded */
    'https://itaku.ee/api/galleries/images/user_starred_imgs/?*', /* starred images on profiles */
  ],
  types: ['xmlhttprequest']
};

browser.webRequest.onBeforeRequest.addListener(
  handleContentWarnings, contentFeeds, ['blocking']);

/* Actual filter code for content warnings. No matches
 * should leave the warning untouched. A positive match
 * should hide the content warning. A negative match should
 * re-show the content warning, overriding the positive match. */
function checkContentObject (result) {
 if (!result.show_content_warning) { return; }
      const show = settings.positive_regexes.reduce((show, regex) => {
        try { /* Catch invalid regex */
          return show || !!result.content_warning.match(regex);
        } catch (err) {
          return show;
        }
      }, false);

      const rehide = settings.negative_regexes.reduce((hide, regex) => {
        try {
          return hide || !!result.content_warning.match(regex);
        } catch (err) {
          return hide;
        }
      }, false);

  if (show && !rehide) { result.show_content_warning = false; }
}

/* Different object types on Itaku are embedded within each other.
 * It's often necessary to repeatedly recurse into objects to
 * get at everything that can have a content warning attached. */
function recursivelyCheckPosts (result) {
  checkContentObject(result);

  if (result.gallery_images) {
    result.gallery_images.forEach((image) => checkContentObject(image));
  }

  /* Handle reposts of images and posts */
  if (result.content_object) {
    recursivelyCheckPosts(result.content_object);
  }
}

/* Entry point: request filter for content warnings. */
function handleContentWarnings (details) {
  let filter = browser.webRequest.filterResponseData(details.requestId);
  let decoder = new TextDecoder('utf-8');
  let encoder = new TextEncoder();

  let str = '';
  filter.ondata = (e) => {
    str += decoder.decode(e.data, { stream: true });
  };

  filter.onstop = (e) => {
    const json = JSON.parse(str);

    /* Most feeds are structured around "results", but we also check recently
     * starred/uploaded lists, which use different keys. For right now, we ignore
     * "latest_active_commissions" because it's not clear content warnings will be
     * applicable to them. */
    const results = json.results || [];
    const latest_gallery_images = json.latest_gallery_images || [];
    const recently_liked_images = json.recently_liked_images || [];
    const pinned_item = json.pinned_item || null;

    if (pinned_item) { recursivelyCheckPosts(pinned_item); }
    results.forEach((obj) => recursivelyCheckPosts(obj));
    latest_gallery_images.forEach((obj) => recursivelyCheckPosts(obj));
    recently_liked_images.forEach((obj) => recursivelyCheckPosts(obj));

    filter.write(encoder.encode(JSON.stringify(json)));

    filter.close();
  }

  return {};
}
