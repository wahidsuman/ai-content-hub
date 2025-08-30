# 🔍 OpenAI Instructions Verification Guide

## Complete Map of All OpenAI Instructions in Your System

This document shows you exactly where all OpenAI instructions are configured and how to verify they're working correctly.

---

## 📝 1. ARTICLE GENERATION INSTRUCTIONS

### Location: `worker/index.js` - Lines 7307-7440

### A. Writing Personas (Lines 7311-7326)
```javascript
// POLITICS
`You are a seasoned political analyst with 20+ years covering Indian politics...`

// TECHNOLOGY
`You are a hands-on technology expert who actually uses and understands the products...`

// BUSINESS
`You are a markets and macroeconomics analyst with deep understanding...`

// ENTERTAINMENT
`You are a witty entertainment journalist with sharp cultural observations...`

// SPORTS
`You are a dynamic sports analyst who brings games to life through words...`
```

### B. Curiosity-Driven Questions (Lines 7328-7341)
```javascript
CRITICAL ENGAGEMENT RULES:
1) HOOK QUESTION: Start with compelling question
2) SECTION QUESTIONS: Use question-form subheadings
3) RHETORICAL QUESTIONS: Weave in thought-provoking questions
4) OPEN-ENDED CONCLUSION: End with forward-looking question
5) CONVERSATIONAL TONE: Write as if explaining to smart friend
```

### C. Content Structure (Lines 7343-7358)
```javascript
REQUIRED STRUCTURE:
- HOOK: Opening with irresistible question
- CONTEXT: Brief background
- 5-8 SECTIONS with question-based H2/H3 subheadings
- DATA & EVIDENCE: Specific numbers, dates, quotes
- MULTIPLE PERSPECTIVES: At least 3 viewpoints
- IMPLICATIONS: Clear explanation for readers
- CONCLUSION: Thoughtful ending with open question

QUALITY REQUIREMENTS:
- Length: 1,500-2,000 words
- Original insights
- Specific details
- Cultural relevance
- Fact-based
```

### How to Verify Article Generation:
```bash
# Check in Telegram bot:
1. Send /start
2. Click "🤖 AI Generator"
3. Click "🎯 Auto Generate"
4. Check the generated article for:
   - Hook question at start
   - Question-based subheadings
   - 1500+ words
   - Open question at end
```

---

## 🎨 2. IMAGE GENERATION INSTRUCTIONS

### Location: `worker/index.js` - Lines 5081-5335

### A. Photorealistic Requirements (Lines 5326-5334)
```javascript
PHOTOREALISTIC REQUIREMENTS:
• PHOTOJOURNALISM STYLE: Shot with professional DSLR camera
• REALISTIC LIGHTING: Natural lighting, no artificial effects
• AUTHENTIC COMPOSITION: Documentary photography style
• NO CARTOONISH ELEMENTS: Completely realistic, news agency quality
• PROFESSIONAL FRAMING: Rule of thirds, proper depth of field
• NEWS PHOTOGRAPHY: Similar to Reuters, AP, or Getty Images
• HIGH DETAIL: Sharp focus, realistic textures and shadows
```

### B. Personality-Specific Images (Lines 5082-5090)
```javascript
// MODI
`Professional news photograph: Prime Minister Narendra Modi at Parliament House...`

// RAHUL GANDHI
`Documentary photograph: Rahul Gandhi at Congress headquarters...`

// BUSINESS LEADERS
`Professional corporate photography...`
```

### C. Context-Specific Images (Lines 5093-5240)
```javascript
// VISA/PASSPORT
`Photorealistic image: Indian passport with visa stamp...`

// MARKET/FINANCE
`Financial market photograph: BSE/NSE trading floor...`

// CRICKET/SPORTS
`Professional cricket photography: Match action shot...`
```

### How to Verify Image Generation:
```bash
# Check generated images for:
1. Photorealistic quality (not cartoon)
2. Professional news photography style
3. Relevant to article content
4. Includes mentioned personalities
5. Natural lighting
```

---

## 📰 3. HEADLINE GENERATION INSTRUCTIONS

### Location: `worker/index.js` - Lines 7452-7518

### A. Enhanced Personas (Lines 7456-7466)
```javascript
// POLITICS
`Chief political editor... makes stories go viral...`

// TECH
`Tech editor whose headlines get highest click rates...`

// BUSINESS
`Business editor who makes financial news irresistible...`
```

### B. Clickability Formulas (Lines 7471-7482)
```javascript
CLICKABILITY FORMULAS:
1. CURIOSITY GAP: "The Unexpected Reason Why [X Happened]"
2. BENEFIT PROMISE: "How [X] Could Change [Specific Outcome]"
3. FEAR OF MISSING OUT: "What Everyone's Missing About [Topic]"
4. CONTROVERSY HINT: "[X]'s Controversial Move That Has [Y] Worried"
5. EXCLUSIVE ANGLE: "Inside Story: How [X] Really [Action]"
6. NUMBERS THAT SHOCK: "[Specific Number] [Units] Later: The [Outcome]"
7. QUESTION HOOK: "Is [Surprising Thing] the Real Reason Behind [Event]?"
```

### C. Power Words (Lines 7484-7491)
```javascript
POWER WORDS TO INCLUDE:
- Reveals, Exposes, Uncovers, Discovers
- Secret, Hidden, Overlooked, Ignored
- Breakthrough, Game-changer, First-ever
- Warning, Alert, Critical, Urgent
- Exclusive, Inside, Behind-the-scenes
```

### How to Verify Headline Generation:
```bash
# Check headlines for:
1. 10-15 words optimal length
2. Uses power words
3. Creates curiosity gap
4. Includes specific details
5. No clickbait lies
```

---

## 🔬 4. RESEARCH CONTEXT GENERATION

### Location: `worker/index.js` - Lines 7240-7280

### Research Assistant Prompt (Lines 7245-7256)
```javascript
Provide:
1. KEY FACTS: Core information and data points
2. STAKEHOLDERS: Who is affected and how
3. CONTEXT: Historical background and recent developments
4. PERSPECTIVES: Different viewpoints on this issue
5. IMPLICATIONS: Potential consequences and future impact
6. INDIAN CONTEXT: Specific relevance to Indian audiences
```

---

## ✅ COMPLETE VERIFICATION CHECKLIST

### 1. Test Article Generation
```bash
# In Telegram:
/topic Technology AI impact on jobs

# Verify output has:
✓ Hook question opening
✓ 5-8 question subheadings
✓ Multiple perspectives
✓ 1500+ words
✓ Specific data points
✓ Open-ended conclusion
```

### 2. Test Image Generation
```bash
# Check any new article image for:
✓ Photorealistic (not cartoon)
✓ Professional news style
✓ Relevant to content
✓ Natural lighting
✓ No AI artifacts
```

### 3. Test Headline Generation
```bash
# Check article headlines for:
✓ Curiosity-driven
✓ 10-15 words
✓ Power words used
✓ Specific details
✓ Creates urgency
```

---

## 🎛️ WHERE TO FIND EACH SETTING

### OpenAI API Configuration
```javascript
// Line 7417-7428: Article Generation
model: 'gpt-4o-mini'
temperature: 0.8
max_tokens: 6000
presence_penalty: 0.4
frequency_penalty: 0.4

// Line 5358-5365: Image Generation
model: 'dall-e-3'
size: '1024x1024'
quality: 'standard'
style: 'natural'

// Line 7565-7570: Headline Generation
model: 'gpt-4o-mini'
temperature: 0.8
max_tokens: 400
```

---

## 🔍 HOW TO MONITOR IN REAL-TIME

### 1. Check Logs in Cloudflare
```bash
# Look for these log entries:
[DALL-E] Attractive prompt for "..."
[IMAGE] Generating DALL-E image for: "..."
generateFullArticle called for: ...
[HEADLINE TEST] Shows generated headlines
```

### 2. Test Individual Components
```javascript
// Test article generation only
/topic Test article about technology

// Monitor image generation
Check article.image.type === 'generated'

// Verify headline variety
Check 5 different headlines generated per article
```

### 3. Cost Tracking
```bash
# In Telegram Control Centre:
Click "💰 Cost Monitor"

# Verify costs:
• GPT-4 Article: ~$0.035
• DALL-E Image: ~$0.040
• Total per article: ~$0.075
```

---

## 🚨 TROUBLESHOOTING

### If Articles Don't Have Questions:
1. Check line 7383-7387 for CRITICAL REQUIREMENTS
2. Verify systemPrompt includes curiosityRules
3. Check quality gate at line 7436-7440

### If Images Look Cartoonish:
1. Check line 5326-5334 for PHOTOREALISTIC REQUIREMENTS
2. Verify style: 'natural' at line 5365
3. Check prompt doesn't include "viral" or "trending"

### If Headlines Aren't Clickable:
1. Check line 7471-7482 for formulas
2. Verify power words at line 7484-7491
3. Ensure temperature: 0.8 for creativity

---

## 📊 VERIFICATION REPORT TEMPLATE

Use this to verify everything is working:

```
✅ ARTICLE GENERATION
[ ] Hook question present
[ ] 5+ question subheadings
[ ] 1500+ words
[ ] Multiple perspectives
[ ] Open-ended conclusion

✅ IMAGE GENERATION
[ ] Photorealistic quality
[ ] Professional style
[ ] Relevant to content
[ ] Natural lighting
[ ] Stored permanently

✅ HEADLINE GENERATION
[ ] Creates curiosity
[ ] Uses power words
[ ] 10-15 words
[ ] Specific details
[ ] Multiple options generated

✅ SYSTEM PERFORMANCE
[ ] Cost per article: ~$0.075
[ ] Generation time: 30-60 seconds
[ ] No errors in logs
[ ] All articles have images
[ ] URLs are SEO slugs
```

---

## 💡 QUICK CHECKS

### To verify OpenAI is receiving all instructions:

1. **Generate a test article**: `/topic Test OpenAI instructions`
2. **Check the output** for all required elements
3. **Review logs** in Cloudflare dashboard
4. **Monitor costs** to ensure proper API usage
5. **Verify image quality** is photorealistic

If all checks pass, your OpenAI is properly configured with all instructions!