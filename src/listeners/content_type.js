export default function content_type(details, response) {
  const url = details.url;
  if (!url.match(/itaku\.ee\/api\/.+\/comments\/\?/)) {
    return response;
  }

  if (!response.results) {
    return response;
  }

  response.results = response.results.map((comment) => {
    comment.content_type = 'comment';
    return comment;
  });

  return response;
}
