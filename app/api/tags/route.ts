import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { objectives: true } } },
    })
    return NextResponse.json(tags)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body.name?.trim()) return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })

    const tag = await prisma.tag.create({
      data: {
        name: body.name.trim(),
        color: body.color || '#6366f1',
      },
    })
    return NextResponse.json(tag, { status: 201 })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Tag name already exists' }, { status: 409 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 })
  }
}
