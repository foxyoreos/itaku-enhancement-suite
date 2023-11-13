export default function includeBlocklistPreFilter (details, blockingResponse = {}, settings = {}) {
  const {
    always_hide_blocklists
  } = settings;

  if (!always_hide_blocklists) {
    return blockingResponse;
  }

  const url = new URL(blockingResponse.redirectURL || details.url);
  if (!url.searchParams.has('use_blacklist')) {
    return blockingResponse;
  }

  url.searchParams.delete('use_blacklist');
  const next = new URL(`${url.origin}${url.pathname}?${url.searchParams}`);
  blockingResponse.redirectUrl = next.href;
  return blockingResponse;
}
