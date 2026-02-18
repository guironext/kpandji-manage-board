"use server";

import { prisma } from "../prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "../generated/prisma";
const Decimal = Prisma.Decimal;

// Types for serialization
interface FactureLigne {
  id: string;
  prix_unitaire: Decimal | number | null;
  montant_ligne: Decimal | number | null;
  voitureModel?: { model: string; image?: string | null; description?: string | null } | null;
  [key: string]: unknown;
}

interface FactureAccessoire {
  id: string;
  nom: string;
  description?: string | null;
  prix?: Decimal | number | null;
  quantity?: number | null;
  image?: string | null;
  [key: string]: unknown;
}

interface FactureWithIncludes {
  id: string;
  date_facture: Date | string;
  date_echeance: Date | string;
  status_facture: string;
  nbr_voiture_commande: number;
  accessoire_nom?: string | null;
  accessoire_description?: string | null;
  accessoire_nbr?: number | null;
  accessoire_prix?: Decimal | number | null;
  accessoire_subtotal?: Decimal | number | null;
  bon_pour_acquis?: boolean | null;
  prix_unitaire: Decimal | number;
  montant_ht: Decimal | number;
  total_ht: Decimal | number;
  remise: Decimal | number;
  montant_remise: Decimal | number;
  montant_net_ht: Decimal | number;
  tva: Decimal | number;
  montant_tva: Decimal | number;
  total_ttc: Decimal | number;
  avance_payee: Decimal | number;
  reste_payer: Decimal | number;
  clientId?: string | null;
  clientEntrepriseId?: string | null;
  client?: unknown;
  clientEntreprise?: unknown;
  voiture?: unknown;
  user?: unknown;
  lignes?: FactureLigne[];
  accessoires?: FactureAccessoire[];
  commandes?: Array<{
    id: string;
    etapeCommande: string;
    createdAt: Date;
  }>;
}

// Helper function to convert Decimal fields to numbers
function serializeFacture(facture: FactureWithIncludes) {
  const lignes = facture.lignes;
  const accessoires = facture.accessoires;
  
  return {
    id: facture.id,
    date_facture: facture.date_facture,
    date_echeance: facture.date_echeance,
    status_facture: facture.status_facture,
    nbr_voiture_commande: facture.nbr_voiture_commande,
    accessoire_nom: facture.accessoire_nom,
    accessoire_description: facture.accessoire_description,
    accessoire_nbr: facture.accessoire_nbr,
    client: facture.client,
    clientEntreprise: facture.clientEntreprise,
    voiture: facture.voiture,
    user: facture.user,
    prix_unitaire: facture.prix_unitaire ? Number(facture.prix_unitaire) : 0,
    montant_ht: facture.montant_ht ? Number(facture.montant_ht) : 0,
    total_ht: facture.total_ht ? Number(facture.total_ht) : 0,
    remise: facture.remise ? Number(facture.remise) : 0,
    montant_remise: facture.montant_remise ? Number(facture.montant_remise) : 0,
    montant_net_ht: facture.montant_net_ht ? Number(facture.montant_net_ht) : 0,
    tva: facture.tva ? Number(facture.tva) : 0,
    montant_tva: facture.montant_tva ? Number(facture.montant_tva) : 0,
    total_ttc: facture.total_ttc ? Number(facture.total_ttc) : 0,
    avance_payee: facture.avance_payee ? Number(facture.avance_payee) : 0,
    reste_payer: facture.reste_payer ? Number(facture.reste_payer) : 0,
    accessoire_prix: facture.accessoire_prix ? Number(facture.accessoire_prix) : null,
    accessoire_subtotal: facture.accessoire_subtotal ? Number(facture.accessoire_subtotal) : null,
    bon_pour_acquis: facture.bon_pour_acquis ?? false,
    lignes: lignes?.map(ligne => ({
      ...ligne,
      prix_unitaire: ligne.prix_unitaire ? Number(ligne.prix_unitaire) : 0,
      montant_ligne: ligne.montant_ligne ? Number(ligne.montant_ligne) : 0,
    })),
    accessoires: accessoires?.map(accessoire => ({
      id: accessoire.id || '',
      nom: accessoire.nom || '',
      description: accessoire.description || null,
      prix: accessoire.prix ? Number(accessoire.prix) : 0,
      quantity: accessoire.quantity ? Number(accessoire.quantity) : 1,
      image: accessoire.image || null,
    })),
    clientId: facture.clientId || null,
    clientEntrepriseId: facture.clientEntrepriseId || null,
    commandes: facture.commandes || [],
  };
}

export async function getAllFactures() {
  try {
    const factures = await prisma.facture.findMany({
      include: {
        client: true,
        user: true,
        voiture: {
          include: {
            voitureModel: true
          }
        },
        lignes: {
          include: {
            voitureModel: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Convert Decimal fields to numbers
    const serializedFactures = factures.map(serializeFacture);
    
    return { success: true, data: serializedFactures };
  } catch (error) {
    console.error("Error fetching factures:", error);
    return { success: false, error: "Failed to fetch factures" };
  }
}

export async function getFacturesByUser(clerkId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId }
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const factures = await prisma.facture.findMany({
      where: { userId: user.id },
      include: {
        client: true,
        clientEntreprise: true,
        user: true,
        voiture: {
          include: {
            voitureModel: true
          }
        },
        lignes: {
          include: {
            voitureModel: true
          }
        },
        accessoires: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    const serializedFactures = factures.map(serializeFacture);
    
    return { success: true, data: serializedFactures };
  } catch (error) {
    console.error("Error fetching user factures:", error);
    return { success: false, error: "Failed to fetch factures" };
  }
}

export async function getProformas() {
  try {
    const proformas = await prisma.facture.findMany({
      where: { status_facture: "PROFORMA" },
      include: {
        client: true,
        clientEntreprise: true,
        user: true,
        voiture: {
          include: {
            voitureModel: true
          }
        },
        lignes: {
          include: {
            voitureModel: true
          }
        },
        accessoires: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Convert Decimal fields to numbers
    const serializedProformas = proformas.map(serializeFacture);
    
    return { success: true, data: serializedProformas };
  } catch (error) {
    console.error("Error fetching proformas:", error);
    return { success: false, error: "Failed to fetch proformas" };
  }
}

export async function getProformasWithoutBonDeCommande() {
  try {
    const proformas = await prisma.facture.findMany({
      where: { 
        status_facture: "PROFORMA",
        bonDeCommande: null
      },
      include: {
        client: true,
        clientEntreprise: true,
        user: true,
        voiture: {
          include: {
            voitureModel: true
          }
        },
        lignes: {
          include: {
            voitureModel: true
          }
        },
        accessoires: true,
        bonDeCommande: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Convert Decimal fields to numbers
    const serializedProformas = proformas.map(serializeFacture);
    
    return { success: true, data: serializedProformas };
  } catch (error) {
    console.error("Error fetching proformas without bon de commande:", error);
    return { success: false, error: "Failed to fetch proformas" };
  }
}

export async function getProformasWithoutBonDeCommandeByUser(clerkId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId }
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    const proformas = await prisma.facture.findMany({
      where: { 
        status_facture: "PROFORMA",
        bonDeCommande: null,
        userId: user.id
      },
      include: {
        client: true,
        clientEntreprise: true,
        user: true,
        voiture: {
          include: {
            voitureModel: true
          }
        },
        lignes: {
          include: {
            voitureModel: true
          }
        },
        accessoires: true,
        bonDeCommande: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Convert Decimal fields to numbers
    const serializedProformas = proformas.map(serializeFacture);
    
    return { success: true, data: serializedProformas };
  } catch (error) {
    console.error("Error fetching proformas without bon de commande by user:", error);
    return { success: false, error: "Failed to fetch proformas" };
  }
}

export async function getFacturesWithBonPourAcquis() {
  try {
    const factures = await prisma.facture.findMany({
      where: { 
        bon_pour_acquis: true
      },
      include: {
        client: true,
        clientEntreprise: true,
        user: true,
        voiture: {
          include: {
            voitureModel: true
          }
        },
        lignes: {
          include: {
            voitureModel: true
          }
        },
        accessoires: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Convert Decimal fields to numbers
    const serializedFactures = factures.map(serializeFacture);
    
    return { success: true, data: serializedFactures };
  } catch (error) {
    console.error("Error fetching factures with bon pour acquis:", error);
    return { success: false, error: "Failed to fetch factures" };
  }
}

export async function updateBonPourAcquis(factureId: string, bonPourAcquis: boolean) {
  try {
    const facture = await prisma.facture.update({
      where: { id: factureId },
      data: { bon_pour_acquis: bonPourAcquis },
      include: {
        client: true,
        clientEntreprise: true,
        user: true,
        voiture: {
          include: {
            voitureModel: true
          }
        },
        lignes: {
          include: {
            voitureModel: true
          }
        },
        accessoires: true
      }
    });
    
    revalidatePath("/commercial/bon-pour-acquis");
    return { success: true, data: serializeFacture(facture) };
  } catch (error: unknown) {
    console.error("Error updating bon pour acquis:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update bon pour acquis";
    return { success: false, error: errorMessage };
  }
}

export async function getFactures() {
  try {
    const factures = await prisma.facture.findMany({
      where: { status_facture: "FACTURE" },
      include: {
        client: true,
        clientEntreprise: true,
        user: true,
        voiture: {
          include: {
            voitureModel: true
          }
        },
        lignes: {
          include: {
            voitureModel: true
          }
        },
        accessoires: true,
        commandes: {
          select: {
            id: true,
            etapeCommande: true,
            createdAt: true
          }
        },
        paiements: {
          select: {
            avance_payee: true
          }
        }
      },
      orderBy: [
        { date_facture: 'desc' },
        { user: { firstName: 'asc' } },
        { user: { lastName: 'asc' } }
      ]
    });
    
    // Recalculate reste_payer based on actual payments
    const facturesWithRecalculatedReste = factures.map(facture => {
      const totalPaid = facture.paiements.reduce(
        (sum, paiement) => sum + Number(paiement.avance_payee),
        0
      );
      const totalTtc = Number(facture.total_ttc);
      const recalculatedRestePayer = Math.max(0, totalTtc - totalPaid);
      
      return {
        ...facture,
        reste_payer: new Decimal(recalculatedRestePayer),
        avance_payee: new Decimal(totalPaid)
      };
    });
    
    const serializedFactures = facturesWithRecalculatedReste.map(serializeFacture);
    
    return { success: true, data: serializedFactures };
  } catch (error) {
    console.error("Error fetching factures:", error);
    return { success: false, error: "Failed to fetch factures" };
  }
}

export async function createFacture(data: {
  clientId: string;
  userId: string;
  voitureId: string;
  date_facture: Date;
  date_echeance: Date;
  nbr_voiture_commande: number;
  prix_unitaire: number;
  remise: number;
  tva: number;
  avance_payee?: number;
  status_facture?: "EN_ATTENTE" | "PROFORMA" | "PAYEE" | "ANNULEE";
}) {
  try {
    const montant_ht = data.prix_unitaire * data.nbr_voiture_commande;
    const total_ht = montant_ht;
    const montant_remise = (montant_ht * data.remise) / 100;
    const montant_net_ht = montant_ht - montant_remise;
    const montant_tva = (montant_net_ht * data.tva) / 100;
    const total_ttc = montant_net_ht + montant_tva;
    const avance_payee = data.avance_payee || 0;
    const reste_payer = total_ttc - avance_payee;

    const facture = await prisma.facture.create({
      data: {
        clientId: data.clientId,
        userId: data.userId,
        voitureId: data.voitureId,
        date_facture: data.date_facture,
        date_echeance: data.date_echeance,
        status_facture: data.status_facture || "PROFORMA",
        nbr_voiture_commande: data.nbr_voiture_commande,
        prix_unitaire: new Decimal(data.prix_unitaire),
        montant_ht: new Decimal(montant_ht),
        total_ht: new Decimal(total_ht),
        remise: new Decimal(data.remise),
        montant_remise: new Decimal(montant_remise),
        montant_net_ht: new Decimal(montant_net_ht),
        tva: new Decimal(data.tva),
        montant_tva: new Decimal(montant_tva),
        total_ttc: new Decimal(total_ttc),
        avance_payee: new Decimal(avance_payee),
        reste_payer: new Decimal(reste_payer)
      }
    });

    revalidatePath("/commercial/proformas");
    
    // Serialize before returning
    return { success: true, data: serializeFacture(facture) };
  } catch (error) {
    console.error("Error creating facture:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create facture";
    return { success: false, error: errorMessage };
  }
}


export async function createFactureWithVoiture(data: {
  clientId: string;
  userId: string;
  voitureModelId: string;
  couleur: string;
  date_facture: Date;
  date_echeance: Date;
  nbr_voiture_commande: number;
  prix_unitaire: number;
  remise: number;
  tva: number;
  avance_payee?: number;
  status_facture?: "EN_ATTENTE" | "PROFORMA" | "PAYEE" | "ANNULEE";
}) {
  try {
    // Create voiture first
    const voiture = await prisma.voiture.create({
      data: {
        couleur: data.couleur,
        voitureModelId: data.voitureModelId,
        clientId: data.clientId,
        nbr_portes: "4",
        transmission: "AUTOMATIQUE",
        motorisation: "ESSENCE",
        etatVoiture: "VENTE"
      }
    });

    // Then create facture
    return await createFacture({
      ...data,
      voitureId: voiture.id
    });
  } catch (error) {
    console.error("Error creating facture with voiture:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create facture";
    return { success: false, error: errorMessage };
  }
}

export async function createFactureWithMultipleLines(data: {
  clientId?: string;
  clientEntrepriseId?: string;
  userId: string;
  date_facture: Date;
  date_echeance: Date;
  remise: number;
  tva: number;
  avance_payee?: number;
  status_facture?: "EN_ATTENTE" | "PROFORMA" | "PAYEE" | "ANNULEE";
  lignes: Array<{
    voitureModelId: string;
    couleur: string;
    nbr_voiture: number;
    prix_unitaire: number;
    transmission?: string;
    motorisation?: string;
  }>;
  accessoires?: Array<{
    nom: string;
    description: string;
    prix_unitaire: number;
    quantity: number;
  }>;
}) {
  try {
    // Calculate totals from all lines
    const montant_ht_articles = data.lignes.reduce((sum, ligne) => 
      sum + (ligne.prix_unitaire * ligne.nbr_voiture), 0
    );
    
    // Calculate totals from accessories if provided
    const montant_ht_accessoires = (data.accessoires || []).reduce((sum, acc) => 
      sum + (acc.prix_unitaire * acc.quantity), 0
    );
    
    const montant_ht = montant_ht_articles + montant_ht_accessoires;
    const total_ht = montant_ht;
    const montant_remise = (montant_ht * data.remise) / 100;
    const montant_net_ht = montant_ht - montant_remise;
    const montant_tva = (montant_net_ht * data.tva) / 100;
    const total_ttc = montant_net_ht + montant_tva;
    const avance_payee = data.avance_payee || 0;
    const reste_payer = total_ttc - avance_payee;

    // Get first line for backward compatibility fields
    const firstLine = data.lignes[0];

    // Calculate accessory aggregate data
    const accessoire_total_nbr = (data.accessoires || []).reduce((sum, acc) => sum + acc.quantity, 0);
    const accessoire_nom_list = (data.accessoires || []).map(acc => `${acc.nom} (x${acc.quantity})`).join(", ");
    const accessoire_description_list = (data.accessoires || []).map(acc => acc.description).filter(desc => desc).join("; ");

    // Get existing accessoires from database to get their images
    const allAccessoires = await prisma.accessoire.findMany({
      where: {
        factureId: null, // Get standalone accessoires
        voitureId: null,
        commandeId: null
      },
      select: {
        id: true,
        nom: true,
        image: true
      }
    });

    const factureData = {
      userId: data.userId,
      date_facture: data.date_facture,
      date_echeance: data.date_echeance,
      status_facture: data.status_facture || "PROFORMA",
      nbr_voiture_commande: firstLine.nbr_voiture,
      prix_unitaire: new Decimal(firstLine.prix_unitaire),
      montant_ht: new Decimal(montant_ht),
      total_ht: new Decimal(total_ht),
      remise: new Decimal(data.remise),
      montant_remise: new Decimal(montant_remise),
      montant_net_ht: new Decimal(montant_net_ht),
      tva: new Decimal(data.tva),
      montant_tva: new Decimal(montant_tva),
      total_ttc: new Decimal(total_ttc),
      avance_payee: new Decimal(avance_payee),
      reste_payer: new Decimal(reste_payer),
      accessoire_nom: accessoire_nom_list || null,
      accessoire_description: accessoire_description_list || null,
      accessoire_prix: montant_ht_accessoires > 0 ? new Decimal((data.accessoires || [])[0].prix_unitaire) : null,
      accessoire_nbr: accessoire_total_nbr > 0 ? accessoire_total_nbr : null,
      accessoire_subtotal: montant_ht_accessoires > 0 ? new Decimal(montant_ht_accessoires) : null,
      lignes: {
        create: data.lignes.map(ligne => ({
          voitureModelId: ligne.voitureModelId,
          couleur: ligne.couleur,
          nbr_voiture: ligne.nbr_voiture,
          prix_unitaire: new Decimal(ligne.prix_unitaire),
          montant_ligne: new Decimal(ligne.prix_unitaire * ligne.nbr_voiture),
          transmission: ligne.transmission || null,
          motorisation: ligne.motorisation || null
        }))
      },
      accessoires: data.accessoires && data.accessoires.length > 0 ? {
        create: data.accessoires.map(acc => {
          const matchingAccessoire = allAccessoires.find(a => a.nom === acc.nom);
          return {
            nom: acc.nom,
            description: acc.description || null,
            prix: acc.prix_unitaire ? new Decimal(acc.prix_unitaire) : null,
            quantity: acc.quantity || 1,
            image: matchingAccessoire?.image || null
          };
        })
      } : undefined,
      ...(data.clientId && { clientId: data.clientId }),
      ...(data.clientEntrepriseId && { clientEntrepriseId: data.clientEntrepriseId }),
    };

    const facture = await prisma.facture.create({
      data: factureData,
      include: {
        lignes: {
          include: {
            voitureModel: true
          }
        },
        accessoires: true,
        client: true,
        clientEntreprise: true,
        user: true
      }
    });

    revalidatePath("/commercial/proformas");
    revalidatePath("/commercial/factures");
    
    return { success: true, data: serializeFacture(facture) };
  } catch (error) {
    console.error("Error creating facture with multiple lines:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create facture";
    return { success: false, error: errorMessage };
  }
}

export async function convertProformaToFacture(factureId: string) {
  try {
    const facture = await prisma.facture.update({
      where: { id: factureId },
      data: { status_facture: "FACTURE" },
      include: {
        client: true,
        user: true,
        voiture: {
          include: {
            voitureModel: true
          }
        }
      }
    });
    
    revalidatePath("/commercial/factures");
    revalidatePath("/commercial/proformas");
    revalidatePath("/comptable/suivi-bon-commande");
    
    return { success: true, data: serializeFacture(facture) };
  } catch (error) {
    console.error("Error converting proforma to facture:", error);
    return { success: false, error: "Failed to convert proforma to facture" };
  }
}

export async function convertToFactureWithClientStatus(factureId: string) {
  try {
    // First get the facture with client info
    const factureData = await prisma.facture.findUnique({
      where: { id: factureId },
      include: {
        client: true,
        clientEntreprise: true
      }
    });

    if (!factureData) {
      return { success: false, error: "Facture not found" };
    }

    // Update facture status
    const facture = await prisma.facture.update({
      where: { id: factureId },
      data: { status_facture: "FACTURE" },
      include: {
        client: true,
        clientEntreprise: true,
        user: true,
        voiture: {
          include: {
            voitureModel: true
          }
        },
        lignes: {
          include: {
            voitureModel: true
          }
        },
        accessoires: true
      }
    });

    // Update client status to PROSPECT if it's a regular client
    if (factureData.clientId) {
      await prisma.client.update({
        where: { id: factureData.clientId },
        data: { status_client: "PROSPECT" }
      });
    }

    // Update clientEntreprise status to PROSPECT if it's an enterprise client
    if (factureData.clientEntrepriseId) {
      await prisma.client_entreprise.update({
        where: { id: factureData.clientEntrepriseId },
        data: { status_client: "PROSPECT" }
      });
    }
    
    revalidatePath("/commercial/factures");
    revalidatePath("/commercial/proformas");
    revalidatePath("/comptable/suivi-bon-commande");
    revalidatePath("/comptable/suivi-bon-pour-acquis");
    
    return { success: true, data: serializeFacture(facture) };
  } catch (error) {
    console.error("Error converting to facture with client status:", error);
    return { success: false, error: "Failed to convert to facture" };
  }
}

export async function getFactureById(factureId: string) {
  try {
    const facture = await prisma.facture.findUnique({
      where: { id: factureId },
      include: {
        client: true,
        clientEntreprise: true,
        user: true,
        voiture: {
          include: {
            voitureModel: true
          }
        },
        lignes: {
          include: {
            voitureModel: true
          }
        },
        accessoires: true,
        paiements: {
          select: {
            avance_payee: true
          }
        }
      }
    });
    
    if (!facture) {
      return { success: false, error: "Facture not found" };
    }
    
    // Recalculate reste_payer based on actual payments
    const totalPaid = facture.paiements.reduce(
      (sum, paiement) => sum + Number(paiement.avance_payee),
      0
    );
    const totalTtc = Number(facture.total_ttc);
    const recalculatedRestePayer = Math.max(0, totalTtc - totalPaid);
    
    const factureWithRecalculatedReste = {
      ...facture,
      reste_payer: new Decimal(recalculatedRestePayer),
      avance_payee: new Decimal(totalPaid)
    };
    
    return { success: true, data: serializeFacture(factureWithRecalculatedReste) };
  } catch (error) {
    console.error("Error fetching facture:", error);
    return { success: false, error: "Failed to fetch facture" };
  }
}

export async function deleteFacture(factureId: string) {
  try {
    await prisma.facture.delete({
      where: { id: factureId }
    });
    
    revalidatePath("/commercial/factures");
    revalidatePath("/commercial/proformas");
    
    return { success: true };
  } catch (error) {
    console.error("Error deleting facture:", error);
    return { success: false, error: "Failed to delete facture" };
  }
}

export async function updateFacture(factureId: string, data: {
  clientId?: string;
  nbr_voiture_commande?: number;
  prix_unitaire?: number;
  remise?: number;
  tva?: number;
  avance_payee?: number;
  date_facture?: Date;
  date_echeance?: Date;
}) {
  try {
    const currentFacture = await prisma.facture.findUnique({ 
      where: { id: factureId },
      include: { voiture: true }
    });
    if (!currentFacture) throw new Error("Facture not found");

    const nbr = data.nbr_voiture_commande ?? currentFacture.nbr_voiture_commande;
    const prix = data.prix_unitaire ?? Number(currentFacture.prix_unitaire);
    const remise = data.remise ?? Number(currentFacture.remise);
    const tva = data.tva ?? Number(currentFacture.tva);
    const avance = data.avance_payee ?? Number(currentFacture.avance_payee);

    const montant_ht = prix * nbr;
    const montant_remise = (montant_ht * remise) / 100;
    const montant_net_ht = montant_ht - montant_remise;
    const montant_tva = (montant_net_ht * tva) / 100;
    const total_ttc = montant_net_ht + montant_tva;
    const reste_payer = total_ttc - avance;

    // Update voiture client if clientId changed (only for single-item factures)
    if (data.clientId && data.clientId !== currentFacture.clientId && currentFacture.voitureId) {
      await prisma.voiture.update({
        where: { id: currentFacture.voitureId },
        data: { clientId: data.clientId }
      });
    }

    const facture = await prisma.facture.update({
      where: { id: factureId },
      data: {
        clientId: data.clientId,
        date_facture: data.date_facture,
        date_echeance: data.date_echeance,
        nbr_voiture_commande: nbr,
        prix_unitaire: new Decimal(prix),
        remise: new Decimal(remise),
        tva: new Decimal(tva),
        avance_payee: new Decimal(avance),
        montant_ht: new Decimal(montant_ht),
        total_ht: new Decimal(montant_ht),
        montant_remise: new Decimal(montant_remise),
        montant_net_ht: new Decimal(montant_net_ht),
        montant_tva: new Decimal(montant_tva),
        total_ttc: new Decimal(total_ttc),
        reste_payer: new Decimal(reste_payer),
      },
      include: {
        client: true,
        user: true,
        voiture: { include: { voitureModel: true } }
      }
    });

    revalidatePath("/commercial/factures");
    revalidatePath("/commercial/proformas");
    return { success: true, data: serializeFacture(facture) };
  } catch (error) {
    console.error("Error updating facture:", error);
    return { success: false, error: "Failed to update facture" };
  }
}