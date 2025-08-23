import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    tags: z.array(z.string()).optional(),
    source: z.string(),
    sourceUrl: z.string().optional(),
    author: z.string().optional(),
    image: z.string().optional(),
  }),
});

export const collections = {
  'blog': blog,
};