import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAdminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COMPILER_URL = 'https://ezcirkit.onrender.com/api/compile';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      code,
      tutorialId,
      chapterId,
      title = 'Tutorial Experiment',
      description = '',
      diagramUrl = '',
      pinout = '',
      videoId = '',
      duration = '5 mins',
      saveToDisk = true,
      saveToFirestore = true,
    } = body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        { success: false, error: 'Arduino code snippet is required to compile.' },
        { status: 400 }
      );
    }

    // Call Render compiler API with a 60s timeout (Render cold starts may take 15-20s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    let compileRes;
    try {
      compileRes = await fetch(COMPILER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ code }),
        signal: controller.signal,
      });
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json(
          { success: false, error: 'Compiler request timed out after 60s. The Render compiler service may still be waking up. Please retry in a few moments.' },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { success: false, error: `Failed to connect to compiler service: ${fetchErr.message}` },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!compileRes.ok) {
      const errText = await compileRes.text();
      return NextResponse.json(
        { success: false, error: `Compiler returned HTTP ${compileRes.status}: ${errText}` },
        { status: compileRes.status }
      );
    }

    const compileData = await compileRes.json();
    if (!compileData.success || !compileData.hex) {
      return NextResponse.json(
        {
          success: false,
          error: compileData.error || compileData.stderr || 'Compilation failed',
          output: compileData.output || compileData.stdout || '',
        },
        { status: 422 }
      );
    }

    const hexContent = compileData.hex;

    // Optional: Save to local disk build & update manifest/bundle
    if (saveToDisk && tutorialId) {
      try {
        const outDir = path.join(process.cwd(), 'public', 'builds', 'experiments');
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }

        const hexPath = path.join(outDir, `${tutorialId}.hex`);
        fs.writeFileSync(hexPath, hexContent, 'utf-8');

        // Update manifest.json
        const manifestPath = path.join(outDir, 'manifest.json');
        let manifest: Record<string, any> = {};
        if (fs.existsSync(manifestPath)) {
          try {
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
          } catch (e) {
            manifest = {};
          }
        }

        manifest[tutorialId] = {
          id: tutorialId,
          chapterId: chapterId || manifest[tutorialId]?.chapterId || '',
          title: title || manifest[tutorialId]?.title || 'Experiment',
          code,
          description: description || manifest[tutorialId]?.description || '',
          diagramUrl: diagramUrl || manifest[tutorialId]?.diagramUrl || '',
          pinout: pinout || manifest[tutorialId]?.pinout || '',
          videoId: videoId || manifest[tutorialId]?.videoId || '',
          duration: duration || manifest[tutorialId]?.duration || '5 mins',
          hexUrl: `/builds/experiments/${tutorialId}.hex`,
          compiledAt: new Date().toISOString(),
          hexBytes: hexContent.length,
        };

        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

        // Update bundle.js
        const bundlePath = path.join(outDir, 'bundle.js');
        const bundleContent = `/**\n * Auto-generated experiment bundle.\n * Updated: ${new Date().toISOString()}\n */\nwindow.PRECOMPILED_EXPERIMENTS = ${JSON.stringify(manifest, null, 2)};\n`;
        fs.writeFileSync(bundlePath, bundleContent, 'utf-8');
      } catch (fsErr: any) {
        console.error('Error saving hex build to disk:', fsErr);
      }
    }

    // Optional: Save directly to Firestore via Firebase Admin SDK
    if (saveToFirestore && chapterId && tutorialId) {
      try {
        const db = await getAdminDb();
        const docRef = db.collection('tutorialChapters').doc(chapterId).collection('tutorials').doc(tutorialId);
        await docRef.set({ compiledHex: hexContent }, { merge: true });
      } catch (dbErr: any) {
        console.error('Error updating Firestore document with compiledHex:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      hex: hexContent,
      size: hexContent.length,
      output: compileData.output || '',
      message: `Successfully compiled (${(hexContent.length / 1024).toFixed(1)} KB) via Render. Ready for instant offline flashing!`,
    });
  } catch (err: any) {
    console.error('Unexpected error in /api/admin/compile-experiment:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error during compilation' },
      { status: 500 }
    );
  }
}

