import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EtapeConteneur, EtapeCommandeGroupee } from '@/lib/generated/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      conteneurNumber, 
      sealNumber, 
      totalPackages, 
      grossWeight, 
      netWeight, 
      stuffingMap, 
      dateEmbarquement, 
      dateArriveProbable,
      commandeIds,
      updateToTransite 
    } = body

    // Validate required fields
    if (!conteneurNumber || !sealNumber) {
      return NextResponse.json(
        { error: 'Le numéro de conteneur et le numéro de scellé sont requis' },
        { status: 400 }
      )
    }

    if (!commandeIds || !Array.isArray(commandeIds) || commandeIds.length === 0) {
      return NextResponse.json(
        { error: 'Au moins une commande doit être fournie' },
        { status: 400 }
      )
    }

    // Check if conteneurNumber already exists
    const existingConteneur = await prisma.conteneur.findUnique({
      where: { conteneurNumber },
    })

    if (existingConteneur) {
      return NextResponse.json(
        { error: 'Un conteneur avec ce numéro existe déjà' },
        { status: 400 }
      )
    }

    // Fetch commandes to get their commandeGroupeeId
    const commandes = await prisma.commande.findMany({
      where: {
        id: { in: commandeIds },
      },
      include: {
        commandeGroupee: true,
      },
    })

    if (commandes.length === 0) {
      return NextResponse.json(
        { error: 'Aucune commande trouvée' },
        { status: 404 }
      )
    }

    // Create the conteneur
    const conteneur = await prisma.conteneur.create({
      data: {
        conteneurNumber,
        sealNumber,
        totalPackages,
        grossWeight,
        netWeight,
        stuffingMap,
        dateEmbarquement: dateEmbarquement ? new Date(dateEmbarquement) : null,
        dateArriveProbable: dateArriveProbable ? new Date(dateArriveProbable) : null,
        etapeConteneur: EtapeConteneur.CHARGE,
      },
    })

    // Update commandes to link them to the conteneur and optionally set to TRANSITE
    await prisma.commande.updateMany({
      where: {
        id: { in: commandeIds },
      },
      data: {
        conteneurId: conteneur.id,
        ...(updateToTransite && { etapeCommande: 'TRANSITE' }),
      },
    })

    // Group commandes by commandeGroupeeId to track which ones need to be updated
    const commandeGroupeeMap = new Map<string, string[]>()
    
    commandes.forEach((cmd) => {
      if (cmd.commandeGroupeeId) {
        if (!commandeGroupeeMap.has(cmd.commandeGroupeeId)) {
          commandeGroupeeMap.set(cmd.commandeGroupeeId, [])
        }
        commandeGroupeeMap.get(cmd.commandeGroupeeId)!.push(cmd.id)
      }
    })

    // Remove commandes from their commandeGroupee and check if empty
    for (const [commandeGroupeeId, removedCommandeIds] of commandeGroupeeMap.entries()) {
      // Remove commandeGroupeeId from commandes
      await prisma.commande.updateMany({
        where: {
          id: { in: removedCommandeIds },
        },
        data: {
          commandeGroupeeId: null,
        },
      })

      // Check if commandeGroupee has any remaining commandes
      const remainingCommandes = await prisma.commande.count({
        where: {
          commandeGroupeeId: commandeGroupeeId,
        },
      })

      // If no commandes left, update commandeGroupee and its remaining commandes to TRANSITE
      if (remainingCommandes === 0) {
        await prisma.commandeGroupee.update({
          where: { id: commandeGroupeeId },
          data: {
            etapeCommandeGroupee: EtapeCommandeGroupee.TRANSITE,
          },
        })
      }
    }

    // Fetch the created conteneur with commandes
    const createdConteneur = await prisma.conteneur.findUnique({
      where: { id: conteneur.id },
      include: {
        commandes: {
          include: {
            voitureModel: true,
            client: true,
            clientEntreprise: true,
          },
        },
      },
    })

    return NextResponse.json(createdConteneur, { status: 201 })
  } catch (error) {
    console.error('Error creating conteneur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du conteneur' },
      { status: 500 }
    )
  }
}

