import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    
    if (!fs.existsSync(publicDir)) {
      return NextResponse.json({ assets: [] });
    }

    const assets: any[] = [];
    // Supported image extensions
    const imgExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'];

    function scanDir(dirPath: string, relativePrefix = '') {
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        // Skip editor folder
        if (file === 'editor' && relativePrefix === '') continue;

        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        const relPath = relativePrefix ? `${relativePrefix}/${file}` : file;

        if (stat.isDirectory()) {
          scanDir(filePath, relPath);
        } else if (stat.isFile()) {
          const ext = path.extname(file).toLowerCase();
          if (imgExtensions.includes(ext)) {
            // Clean up name for presentation: split on dashes or underscores
            const cleanName = file
              .replace(ext, '')
              .split(/[_-]/)
              .filter(Boolean)
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');

            assets.push({
              name: cleanName,
              fileName: file,
              path: `/${relPath}`,
              mtime: stat.mtimeMs,
              size: stat.size
            });
          }
        }
      }
    }

    scanDir(publicDir);

    return NextResponse.json({ assets });
  } catch (error: any) {
    console.error('Error listing assets:', error);
    return NextResponse.json({ error: 'Failed to list assets' }, { status: 500 });
  }
}

