function checkBlocklisted(obj, user) {

  /* Exclude your own pictures. */
  if (user?.id === obj.owner) { return []; }

  /* Pretty basic for now because we're not doing expressions yet. */
  return obj?.blacklisted?.is_blacklisted ? obj.blacklisted.tags : [];
}

function checkBlockedUser(obj, user) {
  if (user?.id === obj.owner) { return false; }
  if (user?.blacklisted_users) {
    return !!user.blacklisted_users[obj.owner];
  }
}

/* Return a content warning, if one exists. */
function getWarning(obj, settings, user) {

  /* Exclude your own pictures. */
  if (user?.id === obj.owner) { return null; }

  /* skip if a warning is not present */
  if (!obj.show_content_warning) { return null; }

  const hide = settings.positive_regexes.reduce((show, regex) => {
    if (regex == '') { return show; }

    try { /* Catch invalid regex */
      return show || !!obj.content_warning.match(regex);
    } catch (err) {
      return show;
    }
  }, false);

  const reshow = settings.negative_regexes.reduce((hide, regex) => {
    if (regex == '') { return hide; }

    try {
      return hide || !!obj.content_warning.match(regex);
    } catch (err) {
      return hide;
    }
  }, false);

  const real_warning = !hide || reshow;
  return real_warning ? obj.content_warning : null;
}

/* Main blocklist handling code. Right now this only handles enforcing settings
 * around blocklist bubbling and forcing blocklisted items to always be hidden. */
export default function blocklist(obj, settings, child_fields, user) {

  /* Aggregate applicable warnings/blocks */
  const blockedTagsSet = new Set([]);
  const contentWarningSet = new Set([]);

  /* Examine children first. */
  child_fields.forEach((field) => {
    const children = obj[field];
    if (!children) { return; }

    /* NOTE: we don't need to recurse here because the "framework"
     * handles recursion for us. This function will always get called
     * on the children first and then the parents. */

    /* Get content warnings and blocked tags for children. */
    children.forEach((child) => {
      if (!settings.bubble_warnings) { return; }
      const warning = getWarning(child, settings, user);
      if (warning) { contentWarningSet.add(warning); }
    });

    children.forEach((child) => {
      if (!settings.bubble_blocklists) { return; }
      const tags = checkBlocklisted(child, user);
      tags.forEach(blockedTagsSet.add, blockedTagsSet);
    });

    /* While we're here, we might as well filter out the children that are blocked. */
    /* We can't remove the top-level `obj`, and it wouldn't be desirable to do
     * so anyway, because it would interfere with bubbling (remember that we
     * check children manually to see if they are blocklisted). But we can
     * filter out children that should be removed, and that's basically just
     * as good. It will affect feeds, image lists within posts, etc... */
    /* Note that we are removing these fields after they've had a chance to push their
     * warnings onto the stack. This may or may not be good behavior, I'm not sure
     * yet. */
    if (settings.always_hide_blocklists) {
      obj[field] = children.filter((child) => {
        /* NOTE: this method must not have side effects, because we're calling it multiple times. */
        return checkBlocklisted(child, user).length === 0 && !checkBlockedUser(child, user);
      });
    }
  });

  /* Add ourselves to the block/warning sets */
  (() => {
    let tags = checkBlocklisted(obj, user);
    let warning = getWarning(obj, settings, user);
    tags.forEach(blockedTagsSet.add, blockedTagsSet);
    if (warning) { contentWarningSet.add(warning); }
  })();

  /* And write. */
  obj.blacklisted = {
    is_blacklisted: blockedTagsSet.size > 0,
    tags: Array.from(blockedTagsSet),
  };


  /* Note that we preserve warnings on individual items even if we're overriding
   * them, so this logic is very slightly more complicated. */
  obj.show_content_warning = contentWarningSet.size > 0;
  obj.content_warning = (() => {
    if (obj.content_warning) {
      contentWarningSet.add(obj.content_warning);
    }

    /* TODO: check to make sure this doesn't break with very long
     * content warnings. */
    return Array.from(contentWarningSet).join(', ');
  })();

  /* Fix for Itaku weirdness that we'll eventually end up overriding probably. Posts can
   * be filtered or not, they can't be hidden behind a block but not filtered.
   * So to get around that, we piggy-back on the content warning system. Note that this
   * will sometimes get caught up with bubbling, but I don't think it matters, at least not
   * for now. */
  if (obj.gallery_images && obj.blacklisted.is_blacklisted) {
    obj.content_warning = `${obj.content_warning ? obj.content_warning + ', ' : ''}Blocked tags: ${obj.blacklisted.tags.join(', ')}`;
    obj.show_content_warning = true;
  }

  return obj;
}
