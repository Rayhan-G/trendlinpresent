export async function onRequest(context) {
  const { request, env, params } = context;
  
  // Cache for 5 minutes at edge
  const cacheKey = new Request(request.url, request);
  const cache = caches.default;
  
  let response = await cache.match(cacheKey);
  
  if (!response) {
    // Read from your static JSON files
    const trendingData = await fetchStaticData();
    
    response = new Response(JSON.stringify(trendingData), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'CDN-Cache-Control': 'public, max-age=300',
        'Cloudflare-CDN-Cache-Control': 'public, max-age=300'
      }
    });
    
    context.waitUntil(cache.put(cacheKey, response.clone()));
  }
  
  return response;
}

async function fetchStaticData() {
  // Fetch from your existing JSON files
  const response = await fetch('https://trendlin.com/api/v1/trending.json');
  return response.json();
}