import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing elcinema ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const targetUrl = `https://elcinema.com/work/${id}/`;
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, label: Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Elcinema returned HTTP ${res.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const html = await res.text();

    // Parse Arabic Title (span dir="rtl" or header)
    let titleAr = '';
    const titleArMatch = html.match(/<span[^>]*dir="rtl"[^>]*>([^<]+)<\/span>/i) ||
                         html.match(/<span class="j-title-ver"[^>]*>([^<]+)<\/span>/i) ||
                         html.match(/<h1[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i) ||
                         html.match(/<title>([^<]+)<\/title>/i);
    if (titleArMatch) {
      titleAr = titleArMatch[1].replace(/- فيلم -.*|- مسلسل -.*|سينما\.كوم/g, '').trim();
    }

    // Parse English Title (span dir="ltr")
    let titleEn = '';
    const titleEnMatch = html.match(/<span[^>]*dir="ltr"[^>]*>([^<]+)<\/span>/i);
    if (titleEnMatch) {
      titleEn = titleEnMatch[1].trim();
    }

    // Determine main display title
    const mainTitle = titleAr || titleEn || '';

    // Generate Slug from English title (t_en) if available, falling back to clean latin string
    const slugBase = titleEn || mainTitle;
    let slug = slugBase
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[-\s]+/g, '-');

    // Fallback if titleEn was purely non-latin characters
    if (!slug) {
      slug = `work-${id}`;
    }

    // Parse Type (Movie vs TV)
    let type: 'movie' | 'tv' = 'movie';
    const catTagMatch = html.match(/href="\/index\/work\/category\/[^"]+"[^>]*>([^<]+)<\/a>/i) ||
                         html.match(/href="\/category\/[^"]+"[^>]*>([^<]+)<\/a>/i);
    if (catTagMatch && (catTagMatch[1].includes('مسلسل') || catTagMatch[1].includes('سيت كوم') || catTagMatch[1].includes('برنامج'))) {
      type = 'tv';
    } else if (html.includes('مسلسل') || html.includes('سيت كوم') || html.includes('برنامج')) {
      type = 'tv';
    }

    // Parse Year
    let year = new Date().getFullYear().toString();
    const yearMatch = html.match(/\((20\d\d|19\d\d)\)/);
    if (yearMatch) {
      year = yearMatch[1];
    }

    // Parse Genres
    const genres: string[] = [];
    const genreMatches = html.matchAll(/href="\/index\/work\/genre\/[^"]+"[^>]*>([^<]+)<\/a>/gi);
    for (const match of genreMatches) {
      const g = match[1].trim();
      if (g && !genres.includes(g)) genres.push(g);
    }

    // Parse Overview / Story
    let overview = '';
    const storyMatch = html.match(/<div class="intro-box[^"]*"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i) ||
                       html.match(/<p class="desc"[^>]*>([\s\S]*?)<\/p>/i);
    if (storyMatch) {
      overview = storyMatch[1].replace(/<[^>]+>/g, '').replace('...اقرأ المزيد', '').trim();
    }

    // Parse Poster Image
    let poster = '';
    const posterMatch = html.match(/<img[^>]+src="(https:\/\/media\.elcinema\.com\/uploads\/[^"]+)"/i) ||
                        html.match(/property="og:image" content="([^"]+)"/i);
    if (posterMatch) {
      poster = posterMatch[1];
    }

    // Parse Cast / Actors
    const cast: string[] = [];
    const castMatches = html.matchAll(/href="\/person\/\d+\/"[^>]*>([^<]+)<\/a>/gi);
    for (const m of castMatches) {
      const actor = m[1].trim();
      if (actor && !cast.includes(actor) && !actor.includes('طاقم') && !actor.includes('المزيد')) {
        cast.push(actor);
      }
    }

    return new Response(JSON.stringify({
      id,
      title: mainTitle,
      titleEn,
      titleAr,
      type,
      year,
      genres,
      overview,
      poster,
      cast: cast.slice(0, 10),
      slug,
      lang: 'ar',
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Failed to fetch from elcinema' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
