import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const quarters = await prisma.quarter.findMany({
      orderBy: { startDate: 'desc' },
      include: { _count: { select: { objectives: true } } },
    })
    return NextResponse.json(quarters)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch quarters' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.name?.trim()) return NextResponse.json({ error: 'Quarter name is required' }, { status: 400 })
    if (!body.startDate) return NextResponse.json({ error: 'Start date is required' }, { status: 400 })
    if (!body.endDate) return NextResponse.json({ error: 'End date is required' }, { status: 400 })

    const quarter = await prisma.quarter.create({
      data: {
        name: body.name.trim(),
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        status: body.status || 'active',
      },
    })
    return NextResponse.json(quarter, { status: 201 })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Quarter name already exists' }, { status: 409 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Failed to create quarter' }, { status: 500 })
  }
}
