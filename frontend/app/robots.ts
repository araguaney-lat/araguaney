import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"

const DISALLOW = ["/dashboard", "/studio", "/api"]

// AI/LLM crawlers we explicitly welcome for public content (product pages,
// guides, /llms.txt). Same allow/disallow as everyone else — the explicit
// entries just make the intent unambiguous so these bots don't get filtered
// by an overly cautious default and can surface Araguaney in AI answers.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
