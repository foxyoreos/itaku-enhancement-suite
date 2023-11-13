/* Default values */
const _settings = {
  positive_regexes: [],
  negative_regexes: [],

  tag_warnings: [], /* temp for tags you want to attach content warnings to. */

  /* Blocklist and warning behaviors */
  bubble_warnings: false,
  bubble_blocklists: false,
  always_hide_blocklists: false,

  /* Anti-gamification settings */
  hide_follower_counts: false,

  /* Feed filtering */
  hide_own_shares: false, /* hide your own posts and reshares from the feed tab. */
  hide_liked_reshares: false, /* hide reshares of objects you've already starred. */
  // hide_followed_reshares: false, /* hide reshares of content uploaded by users you already follow. */
  // exempt_unstarred_self_reshares: true, /* show reshares by an uploader of their own content, even if `hide_followed_reshares` is checked.
  //                                        * This is still overridden by `hide_liked_reshares`. */

  /* Misc */
  sort_comments_descending: false,

  /* Toggleable site fixes */
  fix_unescaped_queries: true,
  fix_submission_notifs: true,

  /* Itaku internal settings */
  __INLINE__mute_submission_notifs: false,
}

let syncing = false;
const settings = new Proxy(_settings, {
  set (settings, prop, value) {
    if (settings[prop] === value) { return true; } /* Don't trigger logic if nothing has actually changed */

    /* And the more complicated array check. */
    if (settings[prop] instanceof Array && value instanceof Array) {
      let changed = settings[prop].length !== value.length || value.reduce((result, item, index) => {
        return result || item !== settings[prop][index]
      }, false);
      if (!changed) { return true; }
    }

    console.log('Set called: ', prop, value);
    settings[prop] = value;

    /* Validation logic for dependent properties. */
    if (settings.always_hide_blocklists && !settings.bubble_blocklists) {
      settings.bubble_blocklists = true;
    }

    if (!syncing) {
      syncing = true;
      setTimeout(() => {
        browser.storage.sync.set(settings);
        syncing = false;
      }, 0);
    }

    return true;
  }
});

browser.storage.onChanged.addListener((changes) => {
  Object.keys(changes).forEach((key) => {
    let value = changes[key].newValue != null ?
        changes[key].newValue : changes[key].oldValue;
    settings[key] = value;
  });
});

/* Initial load */
(async () => {
  const storageSettings = await browser.storage.sync.get();
  Object.assign(settings, storageSettings);

  /* TODO: is this still necessary? */
  settings.positive_regexes = settings.positive_regexes || [];
  settings.negative_regexes = settings.negative_regexes || [];
  settings.tag_warnings = settings.tag_warnings || [];

  /* After initial load, trigger a save so that defaults get set correctly. */
  browser.storage.sync.set(_settings);
})();

export default settings;
