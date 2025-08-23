import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    tags: z.array(z.string()).optional(),
    source: z.string(),
    sourceUrl: z.string().url().optional(),
    author: z.string().optional(),
    image: z.string().optional(),
    featured: z.boolean().optional().default(false),
  }),
});

export const collections = {
  blog,
};