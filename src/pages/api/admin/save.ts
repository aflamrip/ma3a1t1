import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await request.json();
    const { action, item, season, episode, episodesBulk } = payload;

    if (action === 'save_item') {
      // Logic for saving or updating an item (movie or tv show)
      return new Response(JSON.stringify({
        success: true,
        message: `تم حفظ ${item.type === 'movie' ? 'الفيلم' : 'المسلسل'} بنجاح!`,
        id: item.id || Date.now().toString(),
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'bulk_episodes') {
      // Logic for bulk inserting episodes into a season
      const parsedEpisodes = (episodesBulk || '')
        .split('\n')
        .map((line: string) => line.trim())
        .filter(Boolean)
        .map((line: string, idx: number) => {
          const parts = line.split('|');
          if (parts.length > 1) {
            return { episode: parts[0].trim(), url: parts[1].trim() };
          }
          return { episode: (idx + 1).toString(), url: line };
        });

      return new Response(JSON.stringify({
        success: true,
        message: `تم إضافة ${parsedEpisodes.length} حلقة بنجاح لموسم المسلسل!`,
        count: parsedEpisodes.length,
        episodes: parsedEpisodes,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
