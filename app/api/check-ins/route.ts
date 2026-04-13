import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const keyResultId = searchParams.get('keyResultId')
    const where = keyResultId ? { keyResultId } : {}

    const checkIns = await prisma.checkIn.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { keyResult: { select: { title: true, objectiveId: true } } },
    })
    return NextResponse.json(checkIns)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch check-ins' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Support batch check-ins: { checkIns: [...], checkedInBy: string }
    if (body.checkIns && Array.isArray(body.checkIns)) {
      const checkedInBy = body.checkedInBy?.trim() || null
      const created = await prisma.$transaction(
        body.checkIns.map((ci: { keyResultId: string; progress: number; confidence: number; notes?: string }) =>
          prisma.checkIn.create({
            data: {
              keyResultId: ci.keyResultId,
              progress: Math.min(100, Math.max(0, Number(ci.progress))),
              confidence: Math.min(100, Math.max(0, Number(ci.confidence))),
              notes: ci.notes?.trim() || null,
              checkedInBy,
            },
          })
        )
      )
      return NextResponse.json(created, { status: 201 })
    }

    // Single check-in
    if (!body.keyResultId) return NextResponse.json({ error: 'keyResultId is required' }, { status: 400 })

    const checkIn = await prisma.checkIn.create({
      data: {
        keyResultId: body.keyResultId,
        progress: Math.min(100, Math.max(0, Number(body.progress || 0))),
        confidence: Math.min(100, Math.max(0, Number(body.confidence || 0))),
        notes: body.notes?.trim() || null,
        checkedInBy: body.checkedInBy?.trim() || null,
      },
    })
    return NextResponse.json(checkIn, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create check-in' }, { status: 500 })
  }
}
