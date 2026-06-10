// Central content loader - ONE script to rule them all
const contentAPI = {
  // Cache for performance
  cache: null,
  
  // Load all posts
  async loadPosts() {
    if (this.cache) return this.cache;
    const response = await fetch('/data/posts.json');
    this.cache = await response.json();
    return this.cache;
  },
  
  // Get posts by category
  async getPostsByCategory(category) {
    const data = await this.loadPosts();
    return data.posts.filter(post => post.category === category);
  },
  
  // Get posts by subcategory
  async getPostsBySubCategory(category, subcategory) {
    const data = await this.loadPosts();
    return data.posts.filter(post => 
      post.category === category && post.subcategory === subcategory
    );
  },
  
  // Get trending posts
  async getTrendingPosts(limit = 5) {
    const data = await this.loadPosts();
    return data.posts
      .filter(post => post.trending)
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  },
  
  // Get latest posts
  async getLatestPosts(limit = 10) {
    const data = await this.loadPosts();
    return data.posts
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
  },
  
  // Get featured post
  async getFeaturedPost(category) {
    const data = await this.loadPosts();
    return data.posts.find(post => post.category === category && post.featured) || data.posts.find(post => post.category === category);
  },
  
  // Search posts
  async searchPosts(query) {
    const data = await this.loadPosts();
    return data.posts.filter(post => 
      post.title.toLowerCase().includes(query.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(query.toLowerCase())
    );
  }
};