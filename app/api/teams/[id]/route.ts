import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const team = await prisma.team.findUnique({
      where: { id },
      include: { _count: { select: { objectives: true } } },
    })
    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    return NextResponse.json(team)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }
    const team = await prisma.team.update({
      where: { id },
      data: { name: body.name.trim() },
    })
    return NextResponse.json(team)
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Team name already exists' }, { status: 409 })
    }
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.team.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 })
  }
}
