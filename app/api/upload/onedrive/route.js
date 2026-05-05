import { NextResponse } from 'next/server';
import { uploadToOneDrive, deleteFromOneDrive } from '@/lib/onedrive';

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name || `upload_${Date.now()}.jpg`;
    const folderPath = formData.get('folderPath') || 'Apps/Dowa-IT-System';

    const result = await uploadToOneDrive(buffer, fileName, folderPath);

    return NextResponse.json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('Upload API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json({ error: 'Missing itemId' }, { status: 400 });
    }

    await deleteFromOneDrive(itemId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
