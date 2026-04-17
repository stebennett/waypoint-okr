import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = body.title.trim()
    if (body.description !== undefined) data.description = body.description?.trim() || null
    if (body.finalScore !== undefined) data.finalScore = body.finalScore !== null ? Number(body.finalScore) : null
    if (body.closeNote !== undefined) data.closeNote = body.closeNote || null

    const keyResult = await prisma.keyResult.update({
      where: { id },
      data,
      include: {
        checkIns: { orderBy: { createdAt: 'desc' } },
      },
    })
    return NextResponse.json(keyResult)
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Key result not found' }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Failed to update key result' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.keyResult.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Key result not found' }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete key result' }, { status: 500 })
  }
}
