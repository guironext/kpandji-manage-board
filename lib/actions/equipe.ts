"use server";

import { prisma } from "../prisma";
import { revalidatePath } from "next/cache";
import { Qualite } from "../prisma";

export async function createEquipe(data: {
  nomEquipe: string;
  chefEquipeId: string;
  activite: string;
  montageId?: string;
}) {
  try {
    const equipe = await prisma.equipe.create({
      data: {
        nomEquipe: data.nomEquipe,
        chefEquipeId: data.chefEquipeId,
        activite: data.activite,
        montageId: data.montageId || null,
      },
      include: {
        chefEquipe: true,
        membres: {
          include: {
            employee: true,
          },
        },
      },
    });

    revalidatePath("/chefusine/equipe");
    return { success: true, data: equipe };
  } catch (error) {
    console.error("Error creating equipe:", error);
    return { success: false, error: "Failed to create equipe" };
  }
}

export async function getAllEquipes() {
  try {
    const equipes = await prisma.equipe.findMany({
      include: {
        chefEquipe: true,
        membres: {
          include: {
            employee: true,
          },
        },
        montage: {
          include: {
            commande: {
              include: {
                client: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: equipes };
  } catch (error) {
    console.error("Error fetching equipes:", error);
    return { success: false, error: "Failed to fetch equipes" };
  }
}

export async function addMemberToEquipe(equipeId: string, employeeId: string, qualite: Qualite, fonction: string) {
  try {
    const membre = await prisma.equipeMembre.create({
      data: {
        equipeId,
        employeeId,
        qualite,
        fonction,
      },
      include: {
        employee: true,
      },
    });

    revalidatePath("/chefusine/equipe");
    return { success: true, data: membre };
  } catch (error) {
    console.error("Error adding member to equipe:", error);
    return { success: false, error: "Failed to add member to equipe" };
  }
}

export async function removeMemberFromEquipe(membreId: string) {
  try {
    await prisma.equipeMembre.delete({
      where: { id: membreId },
    });

    revalidatePath("/chefusine/equipe");
    return { success: true };
  } catch (error) {
    console.error("Error removing member from equipe:", error);
    return { success: false, error: "Failed to remove member from equipe" };
  }
}

export async function updateEquipe(id: string, data: {
  nomEquipe?: string;
  activite?: string;
  chefEquipeId?: string;
}) {
  try {
    const equipe = await prisma.equipe.update({
      where: { id },
      data,
      include: {
        chefEquipe: true,
        membres: {
          include: {
            employee: true,
          },
        },
      },
    });

    revalidatePath("/chefusine/equipe");
    return { success: true, data: equipe };
  } catch (error) {
    console.error("Error updating equipe:", error);
    return { success: false, error: "Failed to update equipe" };
  }
}

export async function deleteEquipe(id: string) {
  try {
    await prisma.equipe.delete({
      where: { id },
    });

    revalidatePath("/chefusine/equipe");
    return { success: true };
  } catch (error) {
    console.error("Error deleting equipe:", error);
    return { success: false, error: "Failed to delete equipe" };
  }
}
