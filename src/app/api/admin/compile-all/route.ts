import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COMPILER_URL = 'https://ezcirkit.onrender.com/api/compile';

function isValidIntelHex(hex: any): boolean {
  if (!hex || typeof hex !== 'string') return false;
  const trimmed = hex.trim();
  return trimmed.startsWith(':') && trimmed.includes(':00000001FF');
}

async function compileCodeWithRetry(code: string, title: string, maxRetries = 2): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const res = await fetch(COMPILER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ code }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      if (!data.success || !data.hex) {
        throw new Error(data.error || data.stderr || 'Compilation returned failure');
      }

      return data.hex;
    } catch (err: any) {
      if (attempt >= maxRetries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
  throw new Error('Compilation failed after retries');
}

export async function POST(req: NextRequest) {
  try {
    const db = await getAdminDb();
    const outDir = path.join(process.cwd(), 'public', 'builds', 'experiments');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const manifestPath = path.join(outDir, 'manifest.json');
    let existingManifest: Record<string, any> = {};
    if (fs.existsSync(manifestPath)) {
      try {
        existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch (e) {
        existingManifest = {};
      }
    }

    const chaptersSnap = await db.collection('tutorialChapters').orderBy('order').get();
    const allTutorials: any[] = [];

    for (const chapDoc of chaptersSnap.docs) {
      const chapData = chapDoc.data();
      const tutsSnap = await chapDoc.ref.collection('tutorials').orderBy('order').get();
      for (const tutDoc of tutsSnap.docs) {
        allTutorials.push({
          ref: tutDoc.ref,
          id: tutDoc.id,
          chapterId: chapDoc.id,
          chapterTitle: chapData.title || '',
          ...tutDoc.data(),
        });
      }
    }

    const manifest: Record<string, any> = {};
    let compiledCount = 0;
    let reusedCount = 0;

    for (let i = 0; i < allTutorials.length; i++) {
      const tut = allTutorials[i];
      let hexContent = '';

      if (isValidIntelHex(tut.compiledHex)) {
        hexContent = tut.compiledHex.trim();
        reusedCount++;
      } else if (existingManifest[tut.id] && isValidIntelHex(existingManifest[tut.id].compiledHex)) {
        hexContent = existingManifest[tut.id].compiledHex.trim();
        reusedCount++;
        await tut.ref.update({ compiledHex: hexContent });
      } else if (tut.code && tut.code.trim()) {
        try {
          hexContent = await compileCodeWithRetry(tut.code, tut.title);
          compiledCount++;
          await tut.ref.update({ compiledHex: hexContent });
        } catch (err: any) {
          console.error(`Error compiling "${tut.title}":`, err.message);
        }
      }

      if (hexContent) {
        const hexFilePath = path.join(outDir, `${tut.id}.hex`);
        fs.writeFileSync(hexFilePath, hexContent, 'utf-8');

        manifest[tut.id] = {
          id: tut.id,
          chapterId: tut.chapterId,
          title: tut.title || 'Experiment',
          order: tut.order || i + 1,
          code: tut.code || '',
          description: tut.description || '',
          diagramUrl: tut.diagramUrl || '',
          pinout: tut.pinout || '',
          components: Array.isArray(tut.components) ? tut.components : [],
          videoId: tut.videoId || '',
          duration: tut.duration || '5 mins',
          hexUrl: `/builds/experiments/${tut.id}.hex`,
          compiledHex: hexContent,
          compiledAt: new Date().toISOString(),
          hexBytes: hexContent.length,
        };
      }
    }

    // Write manifest.json
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

    // Write bundle.js
    const bundlePath = path.join(outDir, 'bundle.js');
    const bundleContent = `/**\n * Auto-generated EZCirkit experiment precompiled binary bundle.\n * Generated: ${new Date().toISOString()}\n * Experiments: ${Object.keys(manifest).length}\n */\nwindow.PRECOMPILED_EXPERIMENTS = ${JSON.stringify(manifest, null, 2)};\n`;
    fs.writeFileSync(bundlePath, bundleContent, 'utf-8');

    return NextResponse.json({
      success: true,
      total: allTutorials.length,
      synced: Object.keys(manifest).length,
      newlyCompiled: compiledCount,
      reused: reusedCount,
      message: `Successfully precompiled & synced ${Object.keys(manifest).length} experiments for direct 0ms USB upload!`,
    });
  } catch (err: any) {
    console.error('Error in /api/admin/compile-all:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
