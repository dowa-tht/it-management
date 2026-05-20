import { NextResponse } from 'next/server';
import { getNoSeriesMapping } from '@/lib/noSeriesMapping';

export async function GET() {
  try {
    const mapping = getNoSeriesMapping();
    const result = Object.entries(mapping).map(([key, value]) => ({
      key,
      displayName: value.displayName
    }));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching No. Series mapping:', error);
    return NextResponse.json({ error: 'Failed to fetch mapping' }, { status: 500 });
  }
}
