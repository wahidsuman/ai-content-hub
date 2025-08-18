import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt").notNull(),
  category: text("category").notNull(), // 'crypto', 'gadgets', 'ai-news'
  status: text("status").notNull().default('draft'), // 'draft', 'pending', 'approved', 'published', 'rejected'
  seoScore: integer("seo_score").default(0),
  keywords: jsonb("keywords").$type<string[]>().default([]),
  metaDescription: text("meta_description"),
  ranking: integer("ranking"),
  views: integer("views").default(0),
  revenue: integer("revenue").default(0), // in cents
  imageUrl: text("image_url"),
  imageAlt: text("image_alt"),
  createdAt: timestamp("created_at").defaultNow(),
  publishedAt: timestamp("published_at"),
  approvedAt: timestamp("approved_at"),
});

export const seoData = pgTable("seo_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").references(() => posts.id),
  keywords: jsonb("keywords").$type<string[]>().default([]),
  backlinks: integer("backlinks").default(0),
  organicTraffic: integer("organic_traffic").default(0),
  clickThroughRate: integer("click_through_rate").default(0), // in basis points
  averagePosition: integer("average_position").default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const systemStatus = pgTable("system_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  service: text("service").notNull(), // 'openai', 'telegram', 'search_console', 'content_scanner'
  status: text("status").notNull(), // 'operational', 'connected', 'syncing', 'active', 'error'
  lastCheck: timestamp("last_check").defaultNow(),
  errorMessage: text("error_message"),
});

export const contentGenerationRequests = pgTable("content_generation_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentType: text("content_type").notNull(),
  keywords: text("keywords").notNull(),
  wordCount: text("word_count").notNull(),
  brief: text("brief"),
  plagiarismCheck: boolean("plagiarism_check").default(true),
  seoOptimization: boolean("seo_optimization").default(true),
  status: text("status").notNull().default('processing'), // 'processing', 'completed', 'failed'
  resultPostId: varchar("result_post_id").references(() => posts.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  publishedAt: true,
  approvedAt: true,
});

export const insertSeoDataSchema = createInsertSchema(seoData).omit({
  id: true,
  lastUpdated: true,
});

export const insertSystemStatusSchema = createInsertSchema(systemStatus).omit({
  id: true,
  lastCheck: true,
});

export const insertContentGenerationRequestSchema = createInsertSchema(contentGenerationRequests).omit({
  id: true,
  createdAt: true,
  status: true,
  resultPostId: true,
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type SeoData = typeof seoData.$inferSelect;
export type InsertSeoData = z.infer<typeof insertSeoDataSchema>;
export type SystemStatus = typeof systemStatus.$inferSelect;
export type InsertSystemStatus = z.infer<typeof insertSystemStatusSchema>;
export type ContentGenerationRequest = typeof contentGenerationRequests.$inferSelect;
export type InsertContentGenerationRequest = z.infer<typeof insertContentGenerationRequestSchema>;
