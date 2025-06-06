import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

async function getCensusTract(lat: number, lng: number) {
  const url = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lng}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
  const res = await axios.get(url);
  const geo = res.data.result.geographies['Census Tracts'][0];
  return {
    state: geo.STATE,
    county: geo.COUNTY,
    tract: geo.TRACT,
  };
}

// 🔹 Use tract info to get demographic data
async function getCensusData({ state, county, tract }: { state: string; county: string; tract: string; }) {
  const url = `https://api.census.gov/data/2022/acs/acs5?get=NAME,B01003_001E,B19013_001E&for=tract:${tract}&in=state:${state}+county:${county}`;
  const res = await axios.get(url);
  const [headers, values] = res.data;
  const data = Object.fromEntries(headers.map((h: string, i: number) => [h, values[i]]));
  return data;
}

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
        Address,
        synthetic,
        Location,
        Activity,
        Time,
        Agents,
        Cars,
        Tactic
      } = body;

      // Validate required fields
      if (!Date || Latitude === undefined || Longitude === undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

       const existing = await prisma.report.findFirst({
        where: {
          Date,
          Latitude,
          Longitude,
          Location,
        
        },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Duplicate report exists' },
          { status: 409 }
        );
      }

      console.log("BUH");

      let censusData = null;
      try {
        const tractInfo = await getCensusTract(Latitude, Longitude);
        censusData = await getCensusData(tractInfo);
        console.warn(censusData);
      } catch (e: any) {
        console.warn('Census data fetch failed:', e.message);
      }

      const created = await prisma.report.create({
        data: {
          Date,
          Latitude,
          Longitude,
          Address: ((body.Location == 'home' || body.Location == 'workplace') ? "Hidden For Confidentiality" : body.Address),
          Location,
          Activity, 
          Time: Time || undefined, 
          Sec: (body.Location == 'home' || body.Location == 'workplace'),
          Description: Desc || undefined,
          Agents: body.Agents,
          Cars: body.Cars,
          Tactic: body.Tactic,
          RelativePopulation: censusData?.B01003_001E ? parseInt(censusData.B01003_001E, 10) : null
        },
      });

      return NextResponse.json(
        { success: true, data: created},
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
