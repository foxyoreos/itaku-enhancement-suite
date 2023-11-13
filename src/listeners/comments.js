export default function comments(details, blockingResponse = {}, settings = {}) {
  const {
    sort_comments_descending,
  } = settings;

  if (!sort_comments_descending) {
    return blockingResponse;
  }

  const url = new URL(blockingResponse.redirectURL || details.url);
  if (!url.pathname.match(/\/api\/.+\/comments/) || url.searchParams.get('ordering') === 'date_added') {
    console.log(url.pathname, url.searchParams.get('order'));
    return blockingResponse;
  }

  url.searchParams.set('ordering', 'date_added');
  const next = new URL(`${url.origin}${url.pathname}?${url.searchParams}`);
  blockingResponse.redirectUrl = next.href;
  return blockingResponse;
}
