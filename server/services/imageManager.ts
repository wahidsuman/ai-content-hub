interface ImageGenerationParams {
  prompt: string;
  category: string;
  style?: 'professional' | 'modern' | 'tech' | 'minimal';
  width?: number;
  height?: number;
}

interface ImageResult {
  url: string;
  alt: string;
  prompt: string;
  width: number;
  height: number;
  optimized: boolean;
}

interface ImageOptimizationOptions {
  quality?: number;
  format?: 'webp' | 'jpg' | 'png';
  width?: number;
  height?: number;
  compress?: boolean;
}

export class ImageManager {
  private readonly fallbackImages = {
    crypto: [
      'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=400&fit=crop'
    ],
    gadgets: [
      'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&h=400&fit=crop'
    ],
    ai: [
      'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1591696205602-2f950c417cb9?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1655635949033-b73d19aeea4f?w=800&h=400&fit=crop'
    ],
    'electric-bikes': [
      'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1544191696-15693df25d40?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1502744688674-c619d1586c9e?w=800&h=400&fit=crop'
    ],
    'electric-cars': [
      'https://images.unsplash.com/photo-1593941707882-a5bac6861ac8?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=400&fit=crop'
    ],
    default: [
      'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=800&h=400&fit=crop',
      'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=800&h=400&fit=crop'
    ]
  };

  private imageCache = new Map<string, ImageResult>();

  async generateImage(params: ImageGenerationParams): Promise<ImageResult> {
    try {
      const cacheKey = `${params.category}-${params.prompt}-${params.style || 'default'}`;
      
      // Check cache first
      if (this.imageCache.has(cacheKey)) {
        return this.imageCache.get(cacheKey)!;
      }

      // In production, integrate with AI image generation APIs:
      // - OpenAI DALL-E 3
      // - Midjourney API
      // - Stable Diffusion
      // - Adobe Firefly
      
      const categoryKey = params.category as keyof typeof this.fallbackImages;
      const imageArray = this.fallbackImages[categoryKey] || this.fallbackImages.default;
      
      // Select random image from category
      const randomIndex = Math.floor(Math.random() * imageArray.length);
      const baseImageUrl = imageArray[randomIndex];
      
      // Add style parameters
      const styleParams = this.getStyleParameters(params.style);
      const optimizedUrl = `${baseImageUrl}${styleParams}`;
      
      const result: ImageResult = {
        url: optimizedUrl,
        alt: this.generateAltText(params.prompt, params.category),
        prompt: params.prompt,
        width: params.width || 800,
        height: params.height || 400,
        optimized: true
      };

      // Cache the result
      this.imageCache.set(cacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error('Image generation failed:', error);
      
      // Return fallback image
      return {
        url: this.fallbackImages.default[0],
        alt: `Default ${params.category} image`,
        prompt: params.prompt,
        width: 800,
        height: 400,
        optimized: false
      };
    }
  }

  private getStyleParameters(style?: string): string {
    const baseParams = '&auto=format&fit=crop&q=80';
    
    switch (style) {
      case 'professional':
        return `${baseParams}&sat=-20&con=10`;
      case 'modern':
        return `${baseParams}&sat=20&sharp=10`;
      case 'tech':
        return `${baseParams}&sat=-10&con=20&sharp=15`;
      case 'minimal':
        return `${baseParams}&sat=-30&con=-10`;
      default:
        return baseParams;
    }
  }

  private generateAltText(prompt: string, category: string): string {
    const cleanPrompt = prompt.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    return `${category} related image showing ${cleanPrompt}`;
  }

  async optimizeImage(imageUrl: string, options: ImageOptimizationOptions = {}): Promise<string> {
    try {
      // In production, integrate with image optimization services:
      // - Cloudinary
      // - ImageKit
      // - AWS CloudFront
      // - Vercel Image Optimization
      
      const {
        quality = 80,
        format = 'webp',
        width = 800,
        height = 400,
        compress = true
      } = options;

      // Add optimization parameters to URL
      let optimizedUrl = imageUrl;
      
      if (imageUrl.includes('unsplash.com')) {
        const params = new URLSearchParams();
        params.set('w', width.toString());
        params.set('h', height.toString());
        params.set('q', quality.toString());
        params.set('auto', 'format');
        params.set('fit', 'crop');
        
        if (compress) {
          params.set('compress', 'true');
        }
        
        optimizedUrl = `${imageUrl}&${params.toString()}`;
      }
      
      return optimizedUrl;
      
    } catch (error) {
      console.error('Image optimization failed:', error);
      return imageUrl; // Return original if optimization fails
    }
  }

  async getCopyrightFreeImages(category: string, count: number = 5): Promise<ImageResult[]> {
    const images: ImageResult[] = [];
    const categoryKey = category as keyof typeof this.fallbackImages;
    const imageArray = this.fallbackImages[categoryKey] || this.fallbackImages.default;
    
    for (let i = 0; i < Math.min(count, imageArray.length); i++) {
      const baseUrl = imageArray[i];
      
      images.push({
        url: await this.optimizeImage(baseUrl),
        alt: `Professional ${category} image ${i + 1}`,
        prompt: `High-quality ${category} content image`,
        width: 800,
        height: 400,
        optimized: true
      });
    }
    
    return images;
  }

  async generateImageForPost(title: string, category: string, keywords: string[]): Promise<ImageResult> {
    // Create AI prompt based on post content
    const prompt = this.createImagePrompt(title, category, keywords);
    
    return await this.generateImage({
      prompt,
      category,
      style: 'professional',
      width: 800,
      height: 400
    });
  }

  private createImagePrompt(title: string, category: string, keywords: string[]): string {
    const titleWords = title.toLowerCase().split(' ').slice(0, 3);
    const keywordSelection = keywords.slice(0, 2);
    
    return `${category} ${titleWords.join(' ')} ${keywordSelection.join(' ')}`.trim();
  }

  async bulkGenerateImages(posts: Array<{
    id: string;
    title: string;
    category: string;
    keywords: string[];
  }>): Promise<Array<{
    postId: string;
    image: ImageResult;
  }>> {
    const results = [];
    
    for (const post of posts) {
      try {
        const image = await this.generateImageForPost(
          post.title,
          post.category,
          post.keywords
        );
        
        results.push({
          postId: post.id,
          image
        });
      } catch (error) {
        console.error(`Failed to generate image for post ${post.id}:`, error);
      }
    }
    
    return results;
  }

  validateImageUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('https://') && 
             (url.includes('unsplash.com') || 
              url.includes('pexels.com') || 
              url.includes('pixabay.com') ||
              url.includes('cloudinary.com') ||
              url.includes('imagekit.io'));
    } catch {
      return false;
    }
  }

  async getImageMetadata(imageUrl: string): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  } | null> {
    try {
      // In production, make HEAD request to get image metadata
      // For now, return default metadata
      return {
        width: 800,
        height: 400,
        format: 'jpg',
        size: 45000 // approximate size in bytes
      };
    } catch (error) {
      console.error('Failed to get image metadata:', error);
      return null;
    }
  }

  clearCache(): void {
    this.imageCache.clear();
    console.log('Image cache cleared');
  }

  getCacheStats(): {
    cacheSize: number;
    cacheKeys: string[];
  } {
    return {
      cacheSize: this.imageCache.size,
      cacheKeys: Array.from(this.imageCache.keys())
    };
  }

  async getBestImageForContent(title: string, keywords: string[], category: string): Promise<{
    url: string;
    alt: string;
    generated: boolean;
  } | null> {
    try {
      // Try to find an existing image first
      const existing = await this.findCopyrightFreeImage(keywords.join(' '), category);
      if (existing) {
        return {
          url: existing.url,
          alt: existing.alt,
          generated: false
        };
      }

      // Generate AI image as fallback
      const generated = await this.generateAIImage(`${title} - ${keywords.join(', ')}`, category);
      if (generated) {
        return {
          url: generated.url,
          alt: generated.alt,
          generated: true
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get best image for content:', error);
      return null;
    }
  }

  async findCopyrightFreeImage(query: string, category: string): Promise<ImageResult | null> {
    const images = await this.getCopyrightFreeImages(category, 1);
    return images.length > 0 ? images[0] : null;
  }

  async generateAIImage(prompt: string, category: string): Promise<ImageResult | null> {
    return await this.generateImage({
      prompt,
      category,
      style: 'professional'
    });
  }
}

export const imageManager = new ImageManager();
