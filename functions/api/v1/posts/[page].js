export async function onRequest(context) {
  const { params } = context;
  const page = parseInt(params.page) || 1;
  const limit = 50; // 50 posts per page
  
  // Get paginated data from your posts structure
  const posts = await getPaginatedPosts(page, limit);
  
  return new Response(JSON.stringify({
    page,
    limit,
    total: await getTotalPosts(),
    posts
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getPaginatedPosts(page, limit) {
  // Read from your existing posts index
  const allPosts = await fetch('https://trendlin.com/api/v1/posts/index.json');
  const posts = await allPosts.json();
  
  const start = (page - 1) * limit;
  return posts.slice(start, start + limit);
}