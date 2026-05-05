import { NextResponse } from 'next/server';
import { uploadToOneDrive, deleteFromOneDrive, getOneDriveFileContent } from '@/lib/onedrive';

/**
 * GET: Fetch image from OneDrive for preview
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');
    const id = searchParams.get('id');

    if (!path && !id) {
      return NextResponse.json({ error: 'Missing path or id' }, { status: 400 });
    }

    const buffer = await getOneDriveFileContent(path || id);
    
    return new Response(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('OneDrive GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST: Upload image (supports FormData or JSON/Base64)
 */
export async function POST(req) {
  try {
    let buffer, fileName, folderPath;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      if (!body.base64Data) throw new Error('Missing base64Data');
      buffer = Buffer.from(body.base64Data, 'base64');
      fileName = body.fileName || `upload_${Date.now()}.jpg`;
      folderPath = body.folderPath || 'Apps/Dowa-IT-System';
    } else {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!file) throw new Error('No file uploaded');
      buffer = Buffer.from(await file.arrayBuffer());
      fileName = file.name;
      folderPath = formData.get('folderPath') || 'Apps/Dowa-IT-System';
    }

    const result = await uploadToOneDrive(buffer, fileName, folderPath);

    return NextResponse.json({ 
      success: true, 
      filePath: result.id // We'll store ID as it's more reliable for deletion/fetch
    });
  } catch (error) {
    console.error('OneDrive POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * DELETE: Remove image from OneDrive
 */
export async function DELETE(req) {
  try {
    const body = await req.json();
    const filePath = body.filePath; // This is the ID we stored

    if (!filePath) {
      return NextResponse.json({ error: 'Missing filePath (id)' }, { status: 400 });
    }

    await deleteFromOneDrive(filePath);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('OneDrive DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
