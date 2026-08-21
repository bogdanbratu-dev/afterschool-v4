const BOT_PATTERNS = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|ia_archiver|crawler|spider|bot\/|robot|headless|prerender|lighthouse|pingdom|uptimerobot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|dataforseobot|gptbot|claudebot/i;

export function isBotUserAgent(ua: string): boolean {
  return BOT_PATTERNS.test(ua || '');
}
