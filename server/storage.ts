import { 
  type Post, 
  type InsertPost, 
  type SeoData, 
  type InsertSeoData,
  type SystemStatus,
  type InsertSystemStatus,
  type ContentGenerationRequest,
  type InsertContentGenerationRequest
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Posts
  getPost(id: string): Promise<Post | undefined>;
  getAllPosts(): Promise<Post[]>;
  getPostsByStatus(status: string): Promise<Post[]>;
  getPostsByCategory(category: string): Promise<Post[]>;
  createPost(post: InsertPost): Promise<Post>;
  updatePost(id: string, post: Partial<Post>): Promise<Post | undefined>;
  deletePost(id: string): Promise<boolean>;

  // SEO Data
  getSeoData(postId: string): Promise<SeoData | undefined>;
  createSeoData(seoData: InsertSeoData): Promise<SeoData>;
  updateSeoData(postId: string, seoData: Partial<SeoData>): Promise<SeoData | undefined>;

  // System Status
  getAllSystemStatus(): Promise<SystemStatus[]>;
  getSystemStatus(service: string): Promise<SystemStatus | undefined>;
  updateSystemStatus(service: string, status: InsertSystemStatus): Promise<SystemStatus>;

  // Content Generation Requests
  createContentRequest(request: InsertContentGenerationRequest): Promise<ContentGenerationRequest>;
  getContentRequest(id: string): Promise<ContentGenerationRequest | undefined>;
  updateContentRequest(id: string, request: Partial<ContentGenerationRequest>): Promise<ContentGenerationRequest | undefined>;
  getPendingContentRequests(): Promise<ContentGenerationRequest[]>;

  // Dashboard Stats
  getDashboardStats(): Promise<{
    todayPosts: number;
    pendingApproval: number;
    averageSeoScore: number;
    totalRevenue: number;
    weeklyGrowth: number;
  }>;
}

export class MemStorage implements IStorage {
  private posts: Map<string, Post>;
  private seoData: Map<string, SeoData>;
  private systemStatus: Map<string, SystemStatus>;
  private contentRequests: Map<string, ContentGenerationRequest>;

  constructor() {
    this.posts = new Map();
    this.seoData = new Map();
    this.systemStatus = new Map();
    this.contentRequests = new Map();
    
    // Initialize with sample data
    this.initializeData();
  }

  private initializeData() {
    // Initialize system status
    const services = [
      { service: 'openai', status: 'operational' },
      { service: 'telegram', status: 'connected' },
      { service: 'search_console', status: 'syncing' },
      { service: 'content_scanner', status: 'active' }
    ];

    services.forEach(({ service, status }) => {
      const statusData: SystemStatus = {
        id: randomUUID(),
        service,
        status,
        lastCheck: new Date(),
        errorMessage: null
      };
      this.systemStatus.set(service, statusData);
    });
  }

  // Posts implementation
  async getPost(id: string): Promise<Post | undefined> {
    return this.posts.get(id);
  }

  async getAllPosts(): Promise<Post[]> {
    return Array.from(this.posts.values()).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getPostsByStatus(status: string): Promise<Post[]> {
    return Array.from(this.posts.values())
      .filter(post => post.status === status)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getPostsByCategory(category: string): Promise<Post[]> {
    return Array.from(## **Step 3: Core React and Server Files**

### **12. Create `client/src/main.tsx`**
- Create new file: `client/src/main.tsx`
- **Copy this content:**

```typescript
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
