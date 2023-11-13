/* General home feed filtering. Arguably this should be merged with the reshare filtering,
 * but I might want that to be broader? It's easy to merge later if necessary.
 * */
export default function reshares(details, response, settings, user) {
  const {
    hide_own_shares,
  } = settings;

  const url = details.url;
  const params = new URL(url).searchParams;
  if (!url.includes('itaku.ee/api/feed/') || params.has('owner')) {
    return response;
  }

  response.results = response.results.filter((item) => {
    /* Hide posts made by the user. */
    if (hide_own_shares && item.owner === user?.id) {
      console.log('filtering: ', item);
      return false;
    }

    return true;
  });

  return response;
}
