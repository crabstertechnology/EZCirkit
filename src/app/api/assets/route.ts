import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    
    if (!fs.existsSync(publicDir)) {
      return NextResponse.json({ assets: [] });
    }

    const files = fs.readdirSync(publicDir);
    const assets = [];

    // Supported image extensions
    const imgExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'];

    for (const file of files) {
      const filePath = path.join(publicDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        if (imgExtensions.includes(ext)) {
          assets.push({
            name: file.replace(ext, '').split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            fileName: file,
            path: `/${file}`,
            mtime: stat.mtimeMs,
            size: stat.size
          });
        }
      }
    }

    return NextResponse.json({ assets });
  } catch (error: any) {
    console.error('Error listing assets:', error);
    return NextResponse.json({ error: 'Failed to list assets' }, { status: 500 });
  }
}
