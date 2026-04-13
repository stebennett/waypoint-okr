import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { objectives: true } } },
    })
    return NextResponse.json(teams)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }
    const team = await prisma.team.create({
      data: { name: body.name.trim() },
    })
    return NextResponse.json(team, { status: 201 })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Team name already exists' }, { status: 409 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}
