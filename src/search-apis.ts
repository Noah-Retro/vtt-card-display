/**
 * VTT Card Display - Search API Functions
 * 
 * All external API searches for monster images and battle maps
 */
import type { SearchResult, BattleMapResult } from './types';
import { IMAGE_EXTENSIONS } from './constants';
import type { App, Vault, TFile } from 'obsidian';

/**
 * Search local vault for monster images
 */
export async function searchLocalVault(
  vault: Vault, 
  searchQuery: string
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const searchTerms = searchQuery.toLowerCase().split(/\s+/);
  
  try {
    const allFiles = vault.getFiles();
    const imageFiles = allFiles.filter((f: TFile) => 
      IMAGE_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext))
    );
    
    for (const file of imageFiles) {
      const fileName = file.name.toLowerCase();
      const filePath = file.path.toLowerCase();
      
      const matchesAll = searchTerms.every(term => 
        fileName.includes(term) || filePath.includes(term)
      );
      
      const matchesSome = searchTerms.some(term => 
        fileName.includes(term) || filePath.includes(term)
      );
      
      if (matchesAll) {
        const resourcePath = vault.getResourcePath(file);
        results.unshift({
          url: resourcePath,
          source: 'Local Vault',
          title: file.name.replace(/\.[^.]+$/, '')
        });
      } else if (matchesSome && results.length < 20) {
        const resourcePath = vault.getResourcePath(file);
        results.push({
          url: resourcePath,
          source: 'Local Vault',
          title: file.name.replace(/\.[^.]+$/, '')
        });
      }
      
      if (results.length >= 20) break;
    }
  } catch (e) { /* ignore */ }
  
  return results;
}

/**
 * Search Fandom wikis
 */
export async function searchFandomWikis(monsterName: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  const wikis = [
    { base: 'forgottenrealms.fandom.com', name: 'Forgotten Realms Wiki' },
    { base: 'dnd.fandom.com', name: 'D&D Wiki' },
  ];
  
  const searchVariants = [
    monsterName,
    monsterName.replace(/\s+/g, '_'),
  ];
  
  for (const wiki of wikis) {
    for (const searchName of searchVariants) {
      try {
        const url = `https://${wiki.base}/api.php?action=query&titles=${encodeURIComponent(searchName)}&prop=pageimages|images&piprop=original&format=json&origin=*&imlimit=10`;
        const response = await fetch(url);
        if (!response.ok) continue;
        
        const data = await response.json();
        const pages = data.query?.pages || {};
        
        for (const pageId in pages) {
          if (pageId === '-1') continue;
          const page = pages[pageId];
          
          if (page.original?.source) {
            results.push({
              url: page.original.source,
              source: wiki.name,
              title: page.title || monsterName
            });
          }
        }
        if (results.length > 0) break;
      } catch (e) { /* CORS error expected */ }
    }
  }
  
  return results;
}

/**
 * Search D&D Beyond known monster images
 */
export function searchDndBeyond(monsterName: string): SearchResult[] {
  const results: SearchResult[] = [];
  
  const knownMonsters: Record<string, string[]> = {
    'beholder': ['https://www.dndbeyond.com/avatars/thumbnails/30783/57/1000/1000/638062024584880857.png'],
    'mind flayer': ['https://www.dndbeyond.com/avatars/thumbnails/30835/570/1000/1000/638063842570726627.png'],
    'owlbear': ['https://www.dndbeyond.com/avatars/thumbnails/30835/876/1000/1000/638063843970232932.png'],
    'dragon': ['https://www.dndbeyond.com/avatars/thumbnails/30761/974/1000/1000/638061113344926498.png'],
    'goblin': ['https://www.dndbeyond.com/avatars/thumbnails/30784/623/1000/1000/638062027226498498.png'],
    'orc': ['https://www.dndbeyond.com/avatars/thumbnails/30835/914/1000/1000/638063844132752513.png'],
    'skeleton': ['https://www.dndbeyond.com/avatars/thumbnails/30836/389/1000/1000/638063846088583498.png'],
    'zombie': ['https://www.dndbeyond.com/avatars/thumbnails/30837/79/1000/1000/638063848914306498.png'],
    'troll': ['https://www.dndbeyond.com/avatars/thumbnails/30836/890/1000/1000/638063848107658498.png'],
    'giant': ['https://www.dndbeyond.com/avatars/thumbnails/30784/333/1000/1000/638062026084648498.png'],
    'wolf': ['https://www.dndbeyond.com/avatars/thumbnails/30837/28/1000/1000/638063848711583498.png'],
    'spider': ['https://www.dndbeyond.com/avatars/thumbnails/30836/440/1000/1000/638063846307193498.png'],
    'mimic': ['https://www.dndbeyond.com/avatars/thumbnails/30835/495/1000/1000/638063842254523498.png'],
    'gelatinous cube': ['https://www.dndbeyond.com/avatars/thumbnails/30784/295/1000/1000/638062025946428498.png'],
    'lich': ['https://www.dndbeyond.com/avatars/thumbnails/30835/305/1000/1000/638063841536473498.png'],
    'vampire': ['https://www.dndbeyond.com/avatars/thumbnails/30836/930/1000/1000/638063848269628498.png'],
    'werewolf': ['https://www.dndbeyond.com/avatars/thumbnails/30836/995/1000/1000/638063848531823498.png'],
    'demon': ['https://www.dndbeyond.com/avatars/thumbnails/30783/400/1000/1000/638062025308243498.png'],
    'devil': ['https://www.dndbeyond.com/avatars/thumbnails/30783/474/1000/1000/638062025514888498.png'],
    'elemental': ['https://www.dndbeyond.com/avatars/thumbnails/30783/808/1000/1000/638062026634568498.png'],
  };
  
  const lowerName = monsterName.toLowerCase();
  for (const [key, urls] of Object.entries(knownMonsters)) {
    if (lowerName.includes(key)) {
      for (const url of urls) {
        results.push({ url, source: 'D&D Beyond', title: monsterName });
      }
    }
  }
  
  return results;
}

/**
 * Search ArtStation
 */
export async function searchArtStation(monsterName: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  try {
    const searchQuery = encodeURIComponent(`dnd ${monsterName}`);
    const url = `https://www.artstation.com/api/v2/search/projects.json?query=${searchQuery}&page=1&per_page=5`;
    
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    
    if (response.ok) {
      const data = await response.json();
      const projects = data.data || [];
      
      for (const project of projects.slice(0, 5)) {
        if (project.cover?.medium_image_url) {
          results.push({
            url: project.cover.medium_image_url.replace('/medium/', '/large/'),
            source: 'ArtStation',
            title: project.title || monsterName
          });
        }
      }
    }
  } catch (e) { /* CORS error expected */ }
  
  return results;
}

/**
 * Search DeviantArt
 */
export async function searchDeviantArt(monsterName: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  try {
    const searchQuery = encodeURIComponent(`dnd ${monsterName} fantasy`);
    const url = `https://backend.deviantart.com/rss.xml?type=deviation&q=${searchQuery}`;
    
    const response = await fetch(url);
    if (response.ok) {
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      const items = xml.querySelectorAll('item');
      
      for (let i = 0; i < Math.min(items.length, 5); i++) {
        const item = items[i];
        const title = item.querySelector('title')?.textContent || monsterName;
        const mediaContent = item.getElementsByTagName('media:content')[0];
        const mediaThumbnail = item.getElementsByTagName('media:thumbnail')[0];
        const imageUrl = mediaContent?.getAttribute('url') || mediaThumbnail?.getAttribute('url');
        
        if (imageUrl) {
          results.push({ url: imageUrl, source: 'DeviantArt', title });
        }
      }
    }
  } catch (e) { /* CORS error expected */ }
  
  return results;
}

/**
 * Search Reddit for monster art
 */
export async function searchReddit(monsterName: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  const subreddits = [
    'DnD', 'dndart', 'ImaginaryMonsters', 'ImaginaryDragons', 
    'DungeonsAndDragons', 'battlemaps'
  ];
  
  for (const subreddit of subreddits) {
    try {
      const searchQuery = encodeURIComponent(monsterName);
      const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${searchQuery}&restrict_sr=1&limit=5&sort=relevance&t=all`;
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ObsidianVTTCardDisplay/1.0' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const posts = data.data?.children || [];
        
        for (const post of posts) {
          const postData = post.data;
          let imageUrl = '';
          
          if (postData.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(postData.url)) {
            imageUrl = postData.url;
          } else if (postData.url && postData.url.includes('i.redd.it')) {
            imageUrl = postData.url;
          } else if (postData.preview?.images?.[0]?.source?.url) {
            imageUrl = postData.preview.images[0].source.url.replace(/&amp;/g, '&');
          } else if (postData.url && postData.url.includes('imgur.com')) {
            imageUrl = postData.url;
            if (!imageUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
              imageUrl = imageUrl.replace('imgur.com', 'i.imgur.com') + '.jpg';
            }
          }
          
          if (imageUrl) {
            results.push({
              url: imageUrl,
              source: `Reddit r/${subreddit}`,
              title: postData.title || monsterName
            });
          }
        }
      }
    } catch (e) { /* CORS or network error */ }
    
    if (results.length >= 15) break;
  }
  
  return results;
}

/**
 * Search Reddit for battle maps
 */
export async function searchRedditBattlemaps(
  query: string, 
  animatedOnly: boolean = false
): Promise<BattleMapResult[]> {
  const results: BattleMapResult[] = [];
  
  try {
    const searchQuery = encodeURIComponent(query + ' battle map');
    const url = `https://www.reddit.com/r/battlemaps+dndmaps+dungeondraft/search.json?q=${searchQuery}&restrict_sr=1&limit=25&sort=top&t=all`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'ObsidianVTTCardDisplay/1.0' }
    });
    
    if (response.ok) {
      const data = await response.json();
      const posts = data?.data?.children || [];
      
      for (const post of posts) {
        const postData = post.data;
        if (!postData) continue;
        
        let imageUrl = '';
        let thumbnail = '';
        let isAnimated = false;
        
        // Get thumbnail
        if (postData.preview?.images?.[0]?.source?.url) {
          thumbnail = postData.preview.images[0].source.url.replace(/&amp;/g, '&');
        }
        
        // Check content type
        if (postData.url && /\.(jpg|jpeg|png|webp)$/i.test(postData.url)) {
          imageUrl = postData.url;
        } else if (postData.url && /\.gif$/i.test(postData.url)) {
          imageUrl = postData.url;
          isAnimated = true;
        } else if (postData.is_video && postData.media?.reddit_video?.fallback_url) {
          imageUrl = postData.media.reddit_video.fallback_url;
          isAnimated = true;
        } else if (postData.preview?.images?.[0]?.source?.url) {
          imageUrl = postData.preview.images[0].source.url.replace(/&amp;/g, '&');
        } else if (postData.url && postData.url.includes('i.redd.it')) {
          imageUrl = postData.url;
        }
        
        if (imageUrl && (!animatedOnly || isAnimated)) {
          results.push({
            url: imageUrl,
            title: postData.title || 'Battle Map',
            source: 'Reddit r/battlemaps',
            thumbnail: thumbnail || imageUrl,
            animated: isAnimated
          });
        }
      }
    }
  } catch (e) { /* ignore */ }
  
  return results;
}

/**
 * Search DeviantArt for battle maps
 */
export async function searchDeviantArtMaps(
  query: string, 
  animatedOnly: boolean = false
): Promise<BattleMapResult[]> {
  if (animatedOnly) return []; // DeviantArt doesn't have animated maps
  
  const results: BattleMapResult[] = [];
  
  try {
    const searchQuery = encodeURIComponent(`${query} battle map dnd`);
    const url = `https://backend.deviantart.com/rss.xml?type=deviation&q=${searchQuery}`;
    
    const response = await fetch(url);
    if (response.ok) {
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, 'text/xml');
      const items = xml.querySelectorAll('item');
      
      for (let i = 0; i < Math.min(items.length, 10); i++) {
        const item = items[i];
        const title = item.querySelector('title')?.textContent || 'Battle Map';
        const mediaContent = item.getElementsByTagName('media:content')[0];
        const mediaThumbnail = item.getElementsByTagName('media:thumbnail')[0];
        const imageUrl = mediaContent?.getAttribute('url') || mediaThumbnail?.getAttribute('url');
        
        if (imageUrl) {
          results.push({
            url: imageUrl,
            title,
            source: 'DeviantArt',
            thumbnail: imageUrl
          });
        }
      }
    }
  } catch (e) { /* ignore */ }
  
  return results;
}

/**
 * Remove duplicate results based on URL
 */
export function deduplicateResults<T extends { url: string }>(results: T[]): T[] {
  const seen = new Set<string>();
  return results.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}
