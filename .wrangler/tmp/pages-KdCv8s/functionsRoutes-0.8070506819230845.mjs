import { onRequest as __api_v1_posts__page__js_onRequest } from "P:\\Ultima\\trendlin\\functions\\api\\v1\\posts\\[page].js"
import { onRequest as __api_v1_trending_js_onRequest } from "P:\\Ultima\\trendlin\\functions\\api\\v1\\trending.js"

export const routes = [
    {
      routePath: "/api/v1/posts/:page",
      mountPath: "/api/v1/posts",
      method: "",
      middlewares: [],
      modules: [__api_v1_posts__page__js_onRequest],
    },
  {
      routePath: "/api/v1/trending",
      mountPath: "/api/v1",
      method: "",
      middlewares: [],
      modules: [__api_v1_trending_js_onRequest],
    },
  ]