export default function fixUnescapedAnds (details, blockingResponse = {}, settings = {}) {
  if (!settings.fix_unescaped_queries) { return blockingResponse; }

  const url = blockingResponse.redirectURL || details.url;
  if (url.slice(0, 21) !== 'https://itaku.ee/api/') {
    return blockingResponse;
  }

  let needsRedirect = false;
  const split = url.split('&');
  const redirect = split[0] + split.slice(1).map(str => {
    if (!str) { return ''; }
    if (str.indexOf('=') === -1) {
      needsRedirect = true;
      return encodeURIComponent(`&${str}`);
    }
    return `&${str}`;
  }).join('');

  if (needsRedirect) {
    blockingResponse.redirectUrl = redirect;
  }

  return blockingResponse;
}
