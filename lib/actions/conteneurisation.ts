"use server";

import { prisma } from "@/lib/prisma";
import { EtapeCommande, EtapeConteneur, EtapeCommandeGroupee } from "@/lib/generated/prisma";
import { revalidatePath } from "next/cache";

// Fetch all validated commandes
export async function getValidatedCommandes() {
  try {
    const commandes = await prisma.commande.findMany({
      where: {
        etapeCommande: EtapeCommande.VALIDE,
        conteneurId: null,
      },
      include: {
        voitureModel: true,
        client: true,
        clientEntreprise: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    // Serialize Decimal values
    const serializedCommandes = commandes.map((commande) => ({
      ...commande,
      prix_unitaire: commande.prix_unitaire ? Number(commande.prix_unitaire) : null,
    }));
    
    return { success: true, data: serializedCommandes };
  } catch (error) {
    console.error("Error fetching validated commandes:", error);
    return { success: false, error: "Failed to fetch commandes" };
  }
}

// Fetch all conteneurs (excluding TRANSITE status)
export async function getAllConteneurs() {
  try {
    const conteneurs = await prisma.conteneur.findMany({
      where: {
        etapeConteneur: {
          not: EtapeConteneur.TRANSITE,
        },
      },
      include: {
        commandes: {
          include: {
            voitureModel: true,
            client: true,
            clientEntreprise: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    
    // Serialize Decimal values in commandes
    const serializedConteneurs = conteneurs.map((conteneur) => ({
      ...conteneur,
      commandes: conteneur.commandes.map((commande) => ({
        ...commande,
        prix_unitaire: commande.prix_unitaire ? Number(commande.prix_unitaire) : null,
      })),
    }));
    
    return { success: true, data: serializedConteneurs };
  } catch (error) {
    console.error("Error fetching conteneurs:", error);
    return { success: false, error: "Failed to fetch conteneurs" };
  }
}

// Create a new conteneur
export async function createConteneur(data: {
  conteneurNumber: string;
  sealNumber: string;
  totalPackages?: string;
  grossWeight?: string;
  netWeight?: string;
  stuffingMap?: string;
  dateEmbarquement?: Date;
  dateArriveProbable?: Date;
}) {
  try {
    const conteneur = await prisma.conteneur.create({
      data: {
        ...data,
        etapeConteneur: EtapeConteneur.EN_ATTENTE,
      },
    });
    revalidatePath("/manager/conteneurisation");
    return { success: true, data: conteneur };
  } catch (error) {
    console.error("Error creating conteneur:", error);
    return { success: false, error: "Failed to create conteneur" };
  }
}

// Assign commande to conteneur
export async function assignCommandeToConteneur(
  commandeId: string,
  conteneurId: string
) {
  try {
    // Update the commande with conteneurId
    await prisma.commande.update({
      where: { id: commandeId },
      data: {
        conteneurId: conteneurId,
      },
    });

    // Update conteneur status to CHARGE
    await prisma.conteneur.update({
      where: { id: conteneurId },
      data: {
        etapeConteneur: EtapeConteneur.CHARGE,
      },
    });

    revalidatePath("/manager/conteneurisation");
    return { success: true };
  } catch (error) {
    console.error("Error assigning commande to conteneur:", error);
    return { success: false, error: "Failed to assign commande" };
  }
}

// Remove commande from conteneur
export async function removeCommandeFromConteneur(commandeId: string) {
  try {
    await prisma.commande.update({
      where: { id: commandeId },
      data: {
        conteneurId: null,
      },
    });

    revalidatePath("/manager/conteneurisation");
    return { success: true };
  } catch (error) {
    console.error("Error removing commande from conteneur:", error);
    return { success: false, error: "Failed to remove commande" };
  }
}

// Send conteneur (update status to TRANSITE)
export async function sendConteneur(conteneurId: string) {
  try {
    // Update conteneur status to TRANSITE
    await prisma.conteneur.update({
      where: { id: conteneurId },
      data: {
        etapeConteneur: EtapeConteneur.TRANSITE,
      },
    });

    // Update all commandes in this conteneur to TRANSITE
    await prisma.commande.updateMany({
      where: { conteneurId: conteneurId },
      data: {
        etapeCommande: EtapeCommande.TRANSITE,
      },
    });

    revalidatePath("/manager/conteneurisation");
    return { success: true };
  } catch (error) {
    console.error("Error sending conteneur:", error);
    return { success: false, error: "Failed to send conteneur" };
  }
}

// Fetch all VALIDE commandeGroupee with their commandes
export async function getValideCommandesGroupees() {
  try {
    const commandesGroupees = await prisma.commandeGroupee.findMany({
      where: {
        etapeCommandeGroupee: EtapeCommandeGroupee.VALIDE,
      },
      include: {
        commandes: {
          include: {
            voitureModel: true,
            client: true,
            clientEntreprise: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Serialize Decimal values and dates
    const serialized = commandesGroupees.map((cg) => ({
      ...cg,
      date_validation: cg.date_validation.toISOString(),
      createdAt: cg.createdAt.toISOString(),
      updatedAt: cg.updatedAt.toISOString(),
      commandes: cg.commandes.map((cmd) => ({
        ...cmd,
        prix_unitaire: cmd.prix_unitaire ? Number(cmd.prix_unitaire) : null,
        date_livraison: cmd.date_livraison.toISOString(),
        createdAt: cmd.createdAt.toISOString(),
        updatedAt: cmd.updatedAt.toISOString(),
      })),
    }));

    return { success: true, data: serialized };
  } catch (error) {
    console.error("Error fetching VALIDE commandes groupées:", error);
    return { success: false, error: "Failed to fetch commandes groupées" };
  }
}

// Update commandeGroupee and its commandes to TRANSITE when empty
export async function updateCommandeGroupeeToTransite(commandeGroupeeId: string) {
  try {
    // Check if commandeGroupee has any commandes left
    const commandeGroupee = await prisma.commandeGroupee.findUnique({
      where: { id: commandeGroupeeId },
      include: {
        commandes: true,
      },
    });

    if (!commandeGroupee) {
      return { success: false, error: "Commande groupée not found" };
    }

    // If there are no commandes left, update to TRANSITE
    if (commandeGroupee.commandes.length === 0) {
      await prisma.commandeGroupee.update({
        where: { id: commandeGroupeeId },
        data: {
          etapeCommandeGroupee: EtapeCommandeGroupee.TRANSITE,
        },
      });
    }

    revalidatePath("/manager/conteneurisation");
    return { success: true };
  } catch (error) {
    console.error("Error updating commande groupée to TRANSITE:", error);
    return { success: false, error: "Failed to update commande groupée" };
  }
}

