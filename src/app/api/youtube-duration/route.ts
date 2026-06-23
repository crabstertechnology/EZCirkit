import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
  }

  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube page: ${response.status}`);
    }

    const html = await response.text();
    
    // Attempt 1: parse lengthSeconds from ytInitialPlayerResponse
    const match = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/);
    if (match && match[1]) {
      const totalSeconds = parseInt(match[1], 10);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      let durationStr = '';
      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remMinutes = minutes % 60;
        durationStr = `${hours}h ${remMinutes}m`;
      } else {
        durationStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
      }

      return NextResponse.json({ duration: durationStr });
    }

    // Attempt 2: parse from meta tag itemprop="duration" (ISO 8601 e.g. PT1M30S)
    const durationMetaMatch = html.match(/<meta\s+itemprop="duration"\s+content="PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"/i);
    if (durationMetaMatch) {
      const hours = parseInt(durationMetaMatch[1] || '0', 10);
      const minutes = parseInt(durationMetaMatch[2] || '0', 10);
      const seconds = parseInt(durationMetaMatch[3] || '0', 10);
      
      let durationStr = '';
      if (hours > 0) {
        durationStr = `${hours}h ${minutes}m`;
      } else {
        durationStr = `${minutes}:${String(seconds).padStart(2, '0')}`;
      }
      return NextResponse.json({ duration: durationStr });
    }

    return NextResponse.json({ duration: '5:00' });
  } catch (error: any) {
    console.error('Error fetching YouTube duration:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch duration' }, { status: 500 });
  }
}
