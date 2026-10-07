/**
 * SEO Utility for ApexTrack
 * Dynamically updates document title, meta descriptions, canonical URLs,
 * and social Open Graph / Twitter Card tags across screen transitions.
 */

export const DEFAULT_CANONICAL_URL = 'https://praveen5512.github.io/Workout-Tracker/';
export const DEFAULT_OG_IMAGE = 'https://praveen5512.github.io/Workout-Tracker/logo512.png';

export const SEO_PRESETS = {
  home: {
    title: 'ApexTrack – Free Offline Workout Tracker & Fitness Logger PWA',
    description: 'Track gym workouts offline, monitor weekly volume and consistency streaks, and auto-sync seamlessly with Google Sheets.',
    keywords: 'workout tracker, offline fitness app, gym logger, google sheets workout tracker, progressive overload, pwa fitness tracker, workout log'
  },
  analytics: {
    title: 'Analytics, 1RM & Performance Dashboard | ApexTrack',
    description: 'Analyze weekly workout volume trends, calculate estimated 1RM personal records, and evaluate consistency and streak adherence.',
    keywords: 'workout analytics, estimated 1rm calculator, personal record tracker, gym volume tracker, workout consistency streaks, progressive overload chart'
  },
  flows: {
    title: 'Workout Flows, Circuit Timers & Interval Routines | ApexTrack',
    description: 'Create and run guided workout flows with seamless rest timers, audio cues, and refresh-proof active session tracking.',
    keywords: 'workout flows, interval timer, hiit routine timer, guided gym circuits, rest timer app, refresh-proof workout player, circuit training'
  },
  list: {
    title: 'Workout History & Exercise Logs | ApexTrack',
    description: 'Browse, filter, and search your complete exercise history with set, rep, load, and duration records synced to Google Sheets.',
    keywords: 'workout log history, exercise diary, gym records, google sheets sync, sets and reps logger, workout search'
  }
};

/**
 * Updates page title and key SEO meta tags dynamically.
 * @param {Object} options
 * @param {string} options.title - Page title
 * @param {string} [options.description] - Meta description
 * @param {string} [options.keywords] - Meta keywords
 * @param {string} [options.canonicalUrl] - Canonical URL
 * @param {string} [options.ogType] - Open Graph type
 * @param {string} [options.ogImage] - Open Graph image URL
 */
export function updateSEO({
  title,
  description,
  keywords,
  canonicalUrl = DEFAULT_CANONICAL_URL,
  ogType = 'website',
  ogImage = DEFAULT_OG_IMAGE
} = {}) {
  if (typeof document === 'undefined') return;

  // 1. Update Title
  if (title) {
    document.title = title;
  }

  // Safe helper to find or create a meta tag
  const setMeta = (attrName, attrValue, content) => {
    if (!content) return;
    let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attrName, attrValue);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  // 2. Standard Meta Tags
  if (description) {
    setMeta('name', 'description', description);
    setMeta('property', 'og:description', description);
    setMeta('name', 'twitter:description', description);
  }

  if (keywords) {
    setMeta('name', 'keywords', keywords);
  }

  // 3. Open Graph Tags
  if (title) {
    setMeta('property', 'og:title', title);
    setMeta('name', 'twitter:title', title);
  }
  setMeta('property', 'og:type', ogType);
  setMeta('property', 'og:url', canonicalUrl);
  setMeta('property', 'og:image', ogImage);
  setMeta('name', 'twitter:image', ogImage);

  // 4. Canonical Link
  if (canonicalUrl) {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
  }
}
