import { NewsItem, NewsBrief } from './types';

const OPENAI_MODEL = 'gpt-4o-mini'; // Cost-optimized model
const OPENAI_MODEL_FALLBACK = 'gpt-3.5-turbo'; // Fallback for cost savings

export async function generateNewsBrief(newsItem: NewsItem, openaiApiKey: string): Promise<NewsBrief> {
  const prompt = `You are a tech news curator. Create a brief summary of this news item for a tech blog.

News Item:
Title: ${newsItem.title}
Description: ${newsItem.description}
Source: ${newsItem.source}
Category: ${newsItem.category}
Link: ${newsItem.link}

Please provide:
1. A concise summary (2-3 sentences)
2. A catchy blog title
3. Relevant tags (3-5 tags)

Format your response as JSON:
{
  "summary": "brief summary here",
  "suggestedTitle": "catchy title here",
  "suggestedTags": ["tag1", "tag2", "tag3"]
}`;

  const response = await callOpenAI(prompt, openaiApiKey);
  
  try {
    const parsed = JSON.parse(response);
    return {
      id: `${newsItem.id}_brief`,
      newsItem,
      summary: parsed.summary,
      suggestedTitle: parsed.suggestedTitle,
      suggestedTags: parsed.suggestedTags,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    // Fallback response
    return {
      id: `${newsItem.id}_brief`,
      newsItem,
      summary: newsItem.description.substring(0, 200) + '...',
      suggestedTitle: newsItem.title,
      suggestedTags: [newsItem.category],
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
  }
}

export async function generateFullArticle(newsBrief: NewsBrief, openaiApiKey: string): Promise<string> {
  const prompt = `Write a professional blog article based on this news brief. The article should be engaging, informative, and SEO-optimized.

News Brief:
Title: ${newsBrief.suggestedTitle}
Summary: ${newsBrief.summary}
Original Source: ${newsBrief.newsItem.source}
Original Link: ${newsBrief.newsItem.link}
Tags: ${newsBrief.suggestedTags.join(', ')}

Requirements:
- Write 800-1200 words
- Include proper headings and structure
- Add relevant context and background information
- Include the original source link
- Make it engaging for tech enthusiasts
- Use markdown format
- Include SEO-friendly meta description
- Add schema.org structured data for article

Format the response as a complete markdown article with frontmatter:

---
title: "${newsBrief.suggestedTitle}"
description: "SEO description here"
date: "${new Date().toISOString().split('T')[0]}"
tags: [${newsBrief.suggestedTags.map(tag => `"${tag}"`).join(', ')}]
source: "${newsBrief.newsItem.source}"
sourceUrl: "${newsBrief.newsItem.link}"
---

[Article content here in markdown format]`;

  return await callOpenAI(prompt, openaiApiKey);
}

async function callOpenAI(prompt: string, apiKey: string, useFallback = false): Promise<string> {
  const model = useFallback ? OPENAI_MODEL_FALLBACK : OPENAI_MODEL;
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional tech news writer and curator. Write engaging, accurate, and well-structured content.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      // Try fallback model if main model fails
      if (!useFallback && response.status >= 500) {
        console.log('Main model failed, trying fallback...');
        return await callOpenAI(prompt, apiKey, true);
      }
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API call failed:', error);
    
    // Try fallback model on any error
    if (!useFallback) {
      console.log('Trying fallback model...');
      return await callOpenAI(prompt, apiKey, true);
    }
    
    throw error;
  }
}

export async function generateBatchBriefs(newsItems: NewsItem[], openaiApiKey: string): Promise<NewsBrief[]> {
  const briefs: NewsBrief[] = [];
  
  // Process items in parallel with optimized rate limiting for 10-15 posts/day
  const batchSize = 5; // Process 5 at a time for better throughput
  for (let i = 0; i < newsItems.length; i += batchSize) {
    const batch = newsItems.slice(i, i + batchSize);
    const batchPromises = batch.map(item => generateNewsBrief(item, openaiApiKey));
    
    try {
      const batchResults = await Promise.all(batchPromises);
      briefs.push(...batchResults);
      
      // Optimized delay between batches (reduced for higher throughput)
      if (i + batchSize < newsItems.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`Error processing batch ${i}-${i + batchSize}:`, error);
      // Continue with next batch even if current fails
    }
  }
  
  return briefs;
}