import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type')?.toLowerCase();

  console.log('TYPE:', type); // 🔍 Log the type

  try {
    const body = await req.json();
    console.log('BODY:', body); // 🔍 Log the payload

    if (type === 'report') {
      const {
        Date,
        Latitude,
        Longitude,
        Desc,
        synthetic,
        Location,
        Activity,
        Time,
      } = body;

      // Validate required fields
      if (!Date || Latitude === undefined || Longitude === undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      const created = await prisma.report.create({
        data: {
          Date,
          Latitude,
          Longitude,
          Location,
          Activity, 
          Time: Time || undefined, 
          Sec: (body.Location == 'home' || body.Location == 'workplace'),
          Description: Desc || undefined,
        },
      });

      return NextResponse.json(
        { success: true, data: created },
        { status: 201 } 
      );
    }
    

    
    return NextResponse.json(
      { success: false, error: `Unknown type: ${type}` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('ERROR:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
