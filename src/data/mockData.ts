import type { ResourceTypeColor, ResourceTypeId } from '@/types/resource';

export interface Resource {
  id: string;
  type: ResourceTypeId;
  title: string;
  author?: string;
  creator?: string;
  platform?: string;
  year?: number;
  duration?: string;
  url?: string;
  description: string;
  notes: string;
  transcript?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  // Short-video specific fields (flattened from legacy nested structure)
  channelName?: string;
  handle?: string;
  viewCount?: number;
  hashtags?: string[];
  extractedAt?: string;
  extractionMethod?: 'auto' | 'manual';
}

export const mockResources: Resource[] = [
  {
    id: '1',
    type: 'book',
    title: 'Atomic Habits',
    author: 'James Clear',
    year: 2018,
    description: 'An Easy & Proven Way to Build Good Habits & Break Bad Ones',
    notes: `# Key Insights

## The 1% Rule
Small changes compound over time. Getting 1% better every day leads to remarkable results.

## The Four Laws of Behavior Change
1. **Make it Obvious** - Environment design is crucial
2. **Make it Attractive** - Temptation bundling works
3. **Make it Easy** - Reduce friction for good habits
4. **Make it Satisfying** - Immediate rewards drive repetition

## Identity-Based Habits
Focus on who you want to become, not just what you want to achieve. Every action is a vote for the type of person you wish to become.

## The Plateau of Latent Potential
Results often come after a long period of seeming plateau. Breakthrough moments are often the result of many previous actions.`,
    tags: ['productivity', 'psychology', 'self-improvement'],
    createdAt: '2024-01-15',
    updatedAt: '2024-01-20'
  },
  {
    id: '2',
    type: 'video',
    title: 'The Future of AI Development',
    creator: 'Lex Fridman',
    platform: 'YouTube',
    duration: '2h 15m',
    url: 'https://youtube.com/watch?v=example',
    description: 'Deep dive into artificial intelligence trends and implications',
    notes: `# Key Discussion Points

## Current AI Capabilities
- LLMs have reached human-level performance in many domains
- Multimodal AI is becoming increasingly sophisticated
- Training costs are becoming a limiting factor

## Future Predictions
- AGI timeline: potentially within 5-10 years
- Need for AI safety research is critical
- Regulatory frameworks are lagging behind development

## Implications for Society
- Job displacement concerns are valid but nuanced
- Education systems need fundamental restructuring
- Human-AI collaboration will be the key`,
    transcript: 'AI-generated transcript would go here...',
    tags: ['AI', 'technology', 'future'],
    createdAt: '2024-01-10',
    updatedAt: '2024-01-12'
  },
  {
    id: '3',
    type: 'podcast',
    title: 'Building Resilient Systems',
    creator: 'Software Engineering Daily',
    duration: '45m',
    description: 'Discussion on system architecture and reliability patterns',
    notes: `# Architecture Principles

## Resilience Patterns
- **Circuit Breakers**: Prevent cascading failures
- **Bulkheads**: Isolate critical resources
- **Timeouts**: Avoid infinite waits
- **Retry with Backoff**: Handle transient failures

## Monitoring & Observability
- Three pillars: Metrics, Logs, Traces
- SLOs vs SLIs - setting proper expectations
- Alert fatigue is a real problem

## Team Organization
- Conway's Law in action
- On-call responsibilities and burnout
- Documentation as code`,
    tags: ['engineering', 'architecture', 'reliability'],
    createdAt: '2024-01-05',
    updatedAt: '2024-01-08'
  },
  {
    id: '4',
    type: 'article',
    title: 'The Science of Deep Work',
    author: 'Cal Newport',
    platform: 'Harvard Business Review',
    description: 'Research-backed strategies for sustained concentration',
    notes: `# Deep Work Fundamentals

## Definition
Professional activities performed in a state of distraction-free concentration that push cognitive capabilities to their limit.

## The Deep Work Hypothesis
The ability to focus without distraction on a cognitively demanding task is becoming increasingly valuable and increasingly rare.

## Strategies for Cultivation
1. **Philosophy**: Monastic, bimodal, rhythmic, or journalistic
2. **Ritual**: Same time, same place, same process
3. **Support**: Tools that enhance rather than distract
4. **Boundaries**: Clear start and stop times

## Digital Minimalism
- Clutter is costly
- Optimization matters
- Intentionality is satisfying`,
    tags: ['productivity', 'focus', 'research'],
    createdAt: '2024-01-20',
    updatedAt: '2024-01-22'
  },
  {
    id: '5',
    type: 'book',
    title: 'The Pragmatic Programmer',
    author: 'David Thomas & Andrew Hunt',
    year: 2019,
    description: 'Your Journey to Mastery, 20th Anniversary Edition',
    notes: `# Core Philosophy

## The Pragmatic Approach
- Take responsibility for your career and learning
- Provide options, don't make lame excuses
- Be a catalyst for change

## Key Principles
- **DRY**: Don't Repeat Yourself
- **Orthogonality**: Eliminate dependencies between unrelated things
- **Reversibility**: There are no final decisions
- **Tracer Bullets**: Use small working examples to explore

## Craftsmanship
- Care about your craft
- Think about your work
- Provide options, not excuses
- Don't live with broken windows`,
    tags: ['programming', 'software-development', 'craftsmanship'],
    createdAt: '2024-01-25',
    updatedAt: '2024-01-28'
  },
  {
    id: '6',
    type: 'video',
    title: 'Design Systems at Scale',
    creator: 'Figma',
    platform: 'YouTube',
    duration: '1h 32m',
    description: 'How to build and maintain design systems for large organizations',
    notes: `# Design System Strategy

## Foundation Elements
- Color palettes with semantic meaning
- Typography scales that work across contexts
- Spacing systems based on mathematical ratios
- Component libraries with clear documentation

## Governance & Adoption
- Design system team structure
- Contribution models (centralized vs. federated)
- Version management and migration strategies
- Success metrics and KPIs

## Technical Implementation
- Token-based design systems
- Multi-platform considerations (web, mobile, desktop)
- Integration with development workflows
- Automated testing for design consistency`,
    tags: ['design', 'systems', 'ui-ux'],
    createdAt: '2024-01-30',
    updatedAt: '2024-02-01'
  }
];

export const getResourcesByType = (type: Resource['type']) => {
  return mockResources.filter(resource => resource.type === type);
};

export const getResourceById = (id: string) => {
  return mockResources.find(resource => resource.id === id);
};

export const getRecentResources = (limit: number = 3) => {
  return [...mockResources]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
};

// Platform-specific field mapping for short-form videos
// @deprecated - Kept for backwards compatibility, but platform is now a top-level field
export const shortFormFieldMap: Record<string, string[]> = {
  'youtube-short': ['channelName', 'hashtags', 'viewCount'],
  tiktok: ['handle', 'hashtags'],
  'instagram-reel': ['handle', 'hashtags']
};

export const resourceTypeConfig: Record<ResourceTypeId, { label: string; icon: string; color: ResourceTypeColor; fields: string[] }> = {
  book: {
    label: 'Books',
    icon: '📚',
    color: 'knowledge-book',
    fields: ['author', 'year', 'isbn']
  },
  video: {
    label: 'Videos',
    icon: '🎬',
    color: 'knowledge-video',
    fields: ['creator', 'platform', 'duration', 'url']
  },
  'short-video': {
    label: 'Short Videos',
    icon: '📱',
    color: 'knowledge-short-video',
    fields: ['platform', 'channelName', 'handle', 'viewCount', 'hashtags', 'duration', 'url']
  },
  podcast: {
    label: 'Podcasts',
    icon: '🎧',
    color: 'knowledge-podcast',
    fields: ['creator', 'platform', 'duration', 'episode']
  },
  article: {
    label: 'Articles',
    icon: '📄',
    color: 'knowledge-article',
    fields: ['author', 'platform', 'readTime', 'url']
  }
};
