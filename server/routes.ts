import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateContent, analyzeSeoScore, checkPlagiarism } from "./services/openai";
import { imageManager } from "./services/imageManager";
import { replitIntegration } from "./services/replitIntegration";
import { googleSearchConsole } from "./services/googleSearchConsole";

import { contentScheduler } from "./services/contentScheduler";
import { seoManager } from "./services/seoManager";
import { webScraperService } from "./services/webScraper";
import { insertPostSchema, insertContentGenerationRequestSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Dashboard Stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Posts endpoints
  app.get("/api/posts", async (req, res) => {
    try {
      const { status, category } = req.query;
      let posts;
      
      if (status) {
        posts = await storage.getPostsByStatus(status as string);
      } else if (category) {
        posts = await storage.getPostsByCategory(category as string);
      } else {
        posts = await storage.getAllPosts();
      }
      
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const post = await storage.getPost(req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  app.post("/api/posts", async (req, res) => {
    try {
      const validatedData = insertPostSchema.parse(req.body);
      const post = await storage.createPost(validatedData);
      res.status(201).json(post);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  // Content generation endpoint
  app.post("/api/content/generate", async (req, res) => {
    try {
      const validatedData = insertContentGenerationRequestSchema.parse(req.body);
      const request = await storage.createContentRequest(validatedData);
      
      // Start content generation process
      try {
        const content = await generateContent(
          validatedData.contentType,
          validatedData.keywords,
          parseInt(validatedData.wor
