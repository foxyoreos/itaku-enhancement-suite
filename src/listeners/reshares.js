/* Gives the user more control over which reshares show up in their `feed` tab.
 *
 * A few potential ideas for other features to build on top of this:
 * - override and show reshares if the image was posted more than X days/months ago
 * - general reshare filtering (don't show two reshares of the same post)
 * */
export default function reshares(details, response, settings, user) {
  const {
    hide_liked_reshared,
    hide_followed_reshares,
    exempt_unstarred_self_reshares,
  } = settings;

  const url = details.url;
  const params = new URL(url).searchParams;
  if (!url.includes('itaku.ee/api/feed/') || params.has('owner')) {
    return response;
  }

  response.results = response.results.filter((item) => {

    /* Only filter reshared objects. */
    if (item.content_type !== 'reshare') { return true; }

    const reshared_by = item.owner;
    const reshare_target = item?.content_object?.content_object;

    /* This should never happen, but let's handle it anyway :3 */
    if (!reshare_target) { return true; }

    /* Run through the checks in order. */
    if (hide_liked_reshared && reshare_target.liked_by_you) {
      return false;
    }

    /* There's currently no way to check these without looking into the user's follow list more directly.
     * It's good to add the stubs, but let's leave them off for now. */
    // if (hide_followed_reshares) {}
    // if (exempt_unstarred_self_reshares) {}
    return true;
  });

  return response;
}
