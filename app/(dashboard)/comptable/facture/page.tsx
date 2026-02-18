"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, FileText, User, Car, Package, Calendar, Palette, DoorClosed, Cog, Zap, Layers } from "lucide-react";
import { getFactures, deleteFacture } from "@/lib/actions/facture";
import { getAllAccessoires } from "@/lib/actions/accessoire";
import { createCommande, getCommandesDisponibles, attribuerCommande } from "@/lib/actions/commande";
import { toast } from "sonner";
import { formatNumberWithSpaces } from "@/lib/utils";

const numberToFrench = (num: number): string => {
  // Vérifier que num est un nombre valide
  if (num === null || num === undefined || isNaN(num) || !isFinite(num)) {
    return "zéro";
  }
  
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

  if (num === 0) return "zéro";
  if (num < 10) return units[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const unit = num % 10;
    if (ten === 7 || ten === 9) return tens[ten - 1] + "-" + teens[unit];
    return tens[ten] + (unit ? "-" + units[unit] : "");
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    return (hundred > 1 ? units[hundred] + " " : "") + "cent" + (hundred > 1 && rest === 0 ? "s" : "") + (rest ? " " + numberToFrench(rest) : "");
  }
  if (num < 1000000) {
    const thousand = Math.floor(num / 1000);
    const rest = num % 1000;
    return (thousand > 1 ? numberToFrench(thousand) + " " : "") + "mille" + (rest ? " " + numberToFrench(rest) : "");
  }
  const million = Math.floor(num / 1000000);
  const rest = num % 1000000;
  return numberToFrench(million) + " million" + (million > 1 ? "s" : "") + (rest ? " " + numberToFrench(rest) : "");
};

type Facture = {
  id: string;
  date_facture: string;
  date_echeance: string;
  status_facture: string;
  nbr_voiture_commande: number;
  prix_unitaire: number;
  montant_ht: number;
  total_ht: number;
  remise: number;
  montant_remise: number;
  montant_net_ht: number;
  tva: number;
  montant_tva: number;
  total_ttc: number;
  avance_payee: number;
  reste_payer: number;
  accessoire_nom?: string | null;
  accessoire_description?: string | null;
  accessoire_prix?: number | null;
  accessoire_nbr?: number | null;
  accessoire_subtotal?: number | null;
  clientId?: string | null;
  clientEntrepriseId?: string | null;
  client: {
    nom: string;
    telephone?: string;
    entreprise?: string;
    localisation?: string;
    commercial?: string;
  } | null;
  clientEntreprise: {
    nom_entreprise: string;
    telephone?: string;
    localisation?: string;
    commercial?: string;
  } | null;
  voiture: {
    voitureModel: {
      model: string;
      image?: string;
      description?: string;
    } | null;
  } | null;
  lignes?: Array<{
    id: string;
    voitureModelId: string;
    couleur: string;
    nbr_voiture: number;
    prix_unitaire: number;
    montant_ligne: number;
    transmission?: string;
    motorisation?: string;
    voitureModel: {
      model: string;
      image?: string;
      description?: string;
    } | null;
  }>;
  accessoires?: Array<{
    id: string;
    nom: string;
    description?: string;
    prix: number;
    quantity?: number;
    image?: string;
  }>;
  user: {
    firstName: string;
    lastName: string;
    email: string;
    telephone?: string;
  } | null;
  commandes?: Array<{
    id: string;
    etapeCommande: string;
    createdAt: Date;
  }>;
};

type CommandeDisponible = {
  id: string;
  couleur: string;
  transmission: string;
  motorisation: string;
  date_livraison: string | Date;
  etapeCommande: string;
  voitureModel?: {
    model: string;
    image?: string | null;
    description?: string | null;
    [key: string]: unknown;
  } | null;
  client?: {
    nom: string;
    telephone?: string;
    [key: string]: unknown;
  } | null;
  clientEntreprise?: {
    nom_entreprise: string;
    telephone?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
};

function getAccessoireImage(
  accessoireNom: string | null | undefined,
  accessoiresList: Array<{ id: string; nom: string; image?: string | null }>
) {
  if (!accessoireNom) return null;
  const name = accessoireNom.split(",")[0]?.split(" (x")[0]?.trim();
  const matched = accessoiresList.find((acc) => acc.nom === name);
  return matched?.image || null;
}

export default function Page() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 1;
  const [factures, setFactures] = useState<Facture[]>([]);
  const [accessoires, setAccessoires] = useState<Array<{ id: string; nom: string; image?: string | null }>>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAttribuerDialogOpen, setIsAttribuerDialogOpen] = useState(false);
  const [commandesDisponibles, setCommandesDisponibles] = useState<CommandeDisponible[]>([]);
  const [selectedCommandeId, setSelectedCommandeId] = useState<string>("");
  const [formData, setFormData] = useState({
    couleur: "",
    nbr_portes: "4",
    transmission: "AUTOMATIQUE" as "AUTOMATIQUE" | "MANUEL",
    motorisation: "ESSENCE" as "ELECTRIQUE" | "ESSENCE" | "DIESEL" | "HYBRIDE",
    date_livraison: "",
    etapeCommande: "PROPOSITION" as "PROPOSITION" | "VALIDE" | "TRANSITE" | "RENSEIGNEE" | "ARRIVE" | "VERIFIER" | "MONTAGE" | "TESTE" | "PARKING" | "CORRECTION" | "VENTE" | "DECHARGE",
  });

  useEffect(() => {
    const fetchData = async () => {
      const [facturesResult, accessoiresResult] = await Promise.all([
        getFactures(),
        getAllAccessoires(),
      ]);
      
      if (facturesResult.success && facturesResult.data) {
        setFactures(facturesResult.data as Facture[]);
      }
      if (accessoiresResult.success && accessoiresResult.data) {
        setAccessoires(accessoiresResult.data);
      }
    };
    fetchData();
  }, []);

  const totalPages = Math.ceil(factures.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = factures.slice(startIndex, endIndex);

  const handlePrint = () => {
    window.print();
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleDelete = async () => {
    const currentFacture = currentData[0];
    if (!currentFacture) return;

    if (confirm(`Êtes-vous sûr de vouloir supprimer cette facture (${currentFacture.id.slice(-7)}) ?`)) {
      const result = await deleteFacture(currentFacture.id);
      if (result.success) {
        toast.success("Facture supprimée avec succès");
        const updatedFactures = await getFactures();
        if (updatedFactures.success && updatedFactures.data) {
          setFactures(updatedFactures.data as Facture[]);
          if (currentPage > Math.ceil(updatedFactures.data.length / itemsPerPage)) {
            setCurrentPage(Math.max(1, Math.ceil(updatedFactures.data.length / itemsPerPage)));
          }
        }
      } else {
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  const handleLancerCommande = () => {
    const currentFacture = currentData[0];
    if (!currentFacture) {
      toast.error("Aucune facture sélectionnée");
      return;
    }

    // Pre-fill form with facture data
    const firstLigne = currentFacture.lignes?.[0];
    setFormData({
      couleur: firstLigne?.couleur || "",
      nbr_portes: "4",
      transmission: (firstLigne?.transmission as "AUTOMATIQUE" | "MANUEL") || "AUTOMATIQUE",
      motorisation: (firstLigne?.motorisation as "ELECTRIQUE" | "ESSENCE" | "DIESEL" | "HYBRIDE") || "ESSENCE",
      date_livraison: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 4 months from now
      etapeCommande: "PROPOSITION",
    });
    setIsDialogOpen(true);
  };

  const handleSubmitCommande = async () => {
    const currentFacture = currentData[0];
    if (!currentFacture) return;

    // Validation
    if (!formData.couleur.trim()) {
      toast.error("Veuillez saisir la couleur du véhicule");
      return;
    }

    if (!formData.date_livraison) {
      toast.error("Veuillez sélectionner la date de livraison");
      return;
    }

    if (!currentFacture.clientId && !currentFacture.clientEntrepriseId) {
      toast.error("Aucun client associé à cette facture");
      return;
    }

    try {
      // Get accessoire IDs from the facture
      const accessoireIds = currentFacture.accessoires?.map(acc => acc.id) || [];
      
      const result = await createCommande({
        couleur: formData.couleur.trim(),
        nbr_portes: formData.nbr_portes,
        transmission: formData.transmission,
        motorisation: formData.motorisation,
        date_livraison: new Date(formData.date_livraison),
        etapeCommande: formData.etapeCommande,
        clientId: currentFacture.clientId || undefined,
        clientEntrepriseId: currentFacture.clientEntrepriseId || undefined,
        voitureModelId: currentFacture.lignes?.[0]?.voitureModelId || undefined,
        factureId: currentFacture.id,
        prix_unitaire: Number(currentFacture.prix_unitaire),
        accessoireIds: accessoireIds.length > 0 ? accessoireIds : undefined,
      });

      if (result.success) {
        toast.success("Commande créée avec succès");
        setIsDialogOpen(false);
        
        // Refresh factures to update button state
        const updatedFactures = await getFactures();
        if (updatedFactures.success && updatedFactures.data) {
          setFactures(updatedFactures.data as Facture[]);
          
        }
      } else {
        toast.error(result.error || "Erreur lors de la création de la commande");
        console.error("Commande creation error:", result.error);
      }
    } catch (error) {
      toast.error("Erreur lors de la création de la commande");
      console.error("Commande creation exception:", error);
    }
  };

  const handleAttribuerCommande = async () => {
    const currentFacture = currentData[0];
    if (!currentFacture) {
      toast.error("Aucune facture sélectionnée");
      return;
    }

    // Fetch available commandes
    const result = await getCommandesDisponibles();
    if (result.success && result.data) {
      setCommandesDisponibles(result.data);
      setIsAttribuerDialogOpen(true);
    } else {
      toast.error("Erreur lors de la récupération des commandes disponibles");
    }
  };

  const handleSubmitAttribution = async () => {
    const currentFacture = currentData[0];
    if (!currentFacture || !selectedCommandeId) {
      toast.error("Veuillez sélectionner une commande");
      return;
    }

    try {
      const result = await attribuerCommande(
        selectedCommandeId,
        currentFacture.id,
        currentFacture.clientId || undefined,
        currentFacture.clientEntrepriseId || undefined
      );

      if (result.success) {
        toast.success("Commande attribuée avec succès");
        setIsAttribuerDialogOpen(false);
        setSelectedCommandeId("");
        
        // Refresh factures to update button state
        const updatedFactures = await getFactures();
        if (updatedFactures.success && updatedFactures.data) {
          setFactures(updatedFactures.data as Facture[]);
        }
      } else {
        toast.error(result.error || "Erreur lors de l'attribution de la commande");
      }
    } catch (error) {
      toast.error("Erreur lors de l'attribution de la commande");
      console.error("Attribution error:", error);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm !important;
            padding: 10mm 15mm !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            background: white !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .print-hide { display: none !important; }
          @page {
            size: A4;
            margin: 0 !important;
          }
          /* Header - first child */
          #printable-area > div:first-child {
            margin-bottom: 5mm !important;
            padding-bottom: 3mm !important;
            page-break-after: avoid;
          }
          /* Each facture container should start on a new page except the first */
          #printable-area > div:not(:first-child) {
            page-break-before: always;
            page-break-inside: avoid;
            min-height: calc(297mm - 20mm - 15mm) !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          /* Footer - stick to bottom */
          .print-footer {
            margin-top: auto !important;
            padding-top: 5mm !important;
            page-break-inside: avoid !important;
            page-break-before: auto !important;
          }
        }
      ` }} />

      <div className="flex flex-col w-full bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="flex w-full justify-between mb-6 print-hide">
            <div className="flex gap-4">
              <Button 
                onClick={handlePrint}
                className="bg-black hover:bg-gray-800 text-amber-400 font-bold border-2 border-amber-500 shadow-lg">
                IMPRIMER
              </Button>

              <Button
                onClick={() => {
                  const currentFacture = currentData[0];
                  if (currentFacture) {
                    router.push(`/comptable/facture/${currentFacture.id}/impot`);
                  }
                }}
                disabled={currentData.length === 0}
                className="bg-black hover:bg-gray-800 text-amber-400 font-bold border-2 border-amber-500 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                FACTURE IMPOT
              </Button>


              <Button
                onClick={handleDelete}
                disabled={currentData.length === 0}
                className="bg-black hover:bg-gray-800 text-amber-400 font-bold border-2 border-amber-500 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                SUPPRIMER
              </Button>
              <Button
                onClick={handleLancerCommande}
                disabled={currentData.length === 0 || (currentData[0]?.commandes && currentData[0].commandes.length > 0)}
                className="bg-black hover:bg-gray-800 text-amber-400 font-bold border-2 border-amber-500 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentData[0]?.commandes && currentData[0].commandes.length > 0 
                  ? "Commande Déjà Créée" 
                  : "Lancer la Commande"}
              </Button>
              <Button
                onClick={handleAttribuerCommande}
                disabled={currentData.length === 0 || (currentData[0]?.commandes && currentData[0].commandes.length > 0)}
                className="bg-black hover:bg-gray-800 text-amber-400 font-bold border-2 border-amber-500 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Attribuer une Commande
              </Button>
            </div>
            <div className="flex gap-x-2 items-center">
            <Button
              onClick={() => {
                const currentFacture = currentData[0];
                if (currentFacture) {
                  router.push(`/comptable/facture/${currentFacture.id}/paiement`);
                }
              }}
              disabled={currentData.length === 0}
              className="bg-black hover:bg-gray-800 text-amber-400 font-bold border-2 border-amber-500 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reçu de Caisse
            </Button>
              <p>Reste à Payer:</p>
              <p className="text-sm text-gray-800 font-bold text-right">
                {currentData[0] ? formatNumberWithSpaces(currentData[0].reste_payer) + " FCFA" : "0 FCFA"}
              </p>
            </div>
          </div>

          <div id="printable-area">
            <div className="flex w-full justify-between border-b-4 border-amber-600 pb-4 mb-3">
              <div>
                <Image src="/logo.png" alt="Logo" width={100} height={50} priority />
              </div>
              <div className="flex flex-col justify-center -mb-14">
                <h1 className="text-2xl font-bold text-black">KPANDJI AUTOMOBILES</h1>
                <p className="text-sm text-gray-800 font-thin">Constructeur et Assembleur Automobile</p>
              </div>
            </div>

            {currentData.map((facture: Facture) => (
              <div key={facture.id}>
                <div>
                  <div className="flex items-end justify-between w-full text-sm font-semibold text-gray-600 gap-x-2">
                    <div></div>
                    <div className="flex text-sm text-black gap-x-2">
                      <p>Date:</p>
                      <p>{new Date(facture.date_facture).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <div className="flex w-full justify-center my-8">
                  <h1 className="text-xl font-bold text-black border border-black px-4 py-2 rounded-lg">
                    {facture.status_facture}
                  </h1>
                </div>

                <div className="flex w-full justify-between mb-6">
                  <div className="text-black font-semibold text-2xl">
                    <div className="flex text-xs text-gray-900 gap-x-2 font-bold">
                      <p>Numéro de Facture:</p>
                      <p className="uppercase">{facture.id.slice(-7)}</p>
                    </div>
                    <div className="flex text-xs text-gray-800 gap-x-2">
                      <p>Créé par:</p>
                      <p>{facture.user?.firstName} {facture.user?.lastName}</p>
                    </div>
                    <div className="flex text-xs text-gray-800 gap-x-2">
                      <p>Contact:</p>
                      <p>{facture.user?.email}</p>
                    </div>
                    <div className="flex text-xs text-gray-800 gap-x-2">
                      <p>Téléphone:</p>
                      <p>{facture.user?.telephone}</p>
                    </div>
                  </div>

                  <div className="text-black font-semibold text-2xl">
                    <div className="flex text-sm font-semibold gap-2">
                      <p>Client:</p>
                      <p>{facture.client?.nom || facture.clientEntreprise?.nom_entreprise}</p>
                    </div>
                    <div className="flex text-xs text-gray-800 gap-x-2">
                      {facture.client?.entreprise && (
                        <>
                          <p>Entreprise:</p>
                          <p>{facture.client.entreprise}</p>
                        </>
                      )}
                    </div>
                    <div className="flex text-xs text-gray-800 gap-x-2">
                      <p>Téléphone:</p>
                      <p>{facture.client?.telephone || facture.clientEntreprise?.telephone}</p>
                    </div>
                    <div className="flex text-xs text-gray-800 gap-x-2">
                      <p>Localisation:</p>
                      <p>{facture.client?.localisation || facture.clientEntreprise?.localisation}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <Table className="rounded-lg overflow-hidden">
                    <TableHeader>
                      <TableRow className="bg-green-50 border-b border-black">
                        <TableHead className="text-black-600 font-bold">#</TableHead>
                        <TableHead className="text-black-600 font-bold">Véhicule</TableHead>
                        <TableHead className="text-black-600 font-bold">Description</TableHead>
                        <TableHead className="text-black-600 font-bold text-center">Quantité</TableHead>
                        <TableHead className="text-black-600 font-bold text-right">Prix Unitaire HT FCFA</TableHead>
                        <TableHead className="text-right text-black-600 font-bold">Total HT FCFA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentData.map((factureItem) => {
                        const lignes = factureItem.lignes && factureItem.lignes.length > 0
                          ? factureItem.lignes
                          : [{
                              id: "1",
                              voitureModelId: "",
                              couleur: "",
                              nbr_voiture: factureItem.nbr_voiture_commande,
                              prix_unitaire: factureItem.prix_unitaire,
                              montant_ligne: factureItem.montant_ht,
                              transmission: "",
                              motorisation: "",
                              voitureModel: factureItem.voiture?.voitureModel || null,
                            }];

                        return lignes.map((ligne, index) => (
                          <TableRow key={`${factureItem.id}-${ligne.id}`} className={index % 2 === 0 ? "bg-white border-b border-orange-200" : "bg-white hover:bg-orange-50 border-b border-orange-200"}>
                            <TableCell className="text-black font-semibold">{index + 1}</TableCell>
                            <TableCell className="text-black">
                              {ligne.voitureModel?.image ? (
                                <Image src={ligne.voitureModel.image} alt={ligne.voitureModel.model || "Vehicle"} width={100} height={80} />
                              ) : ("N/A")}
                            </TableCell>
                            <TableCell className="text-black flex flex-col gap-y-1 text-lg font-semibold">
                              {ligne.voitureModel?.model || "N/A"}
                              <p className="text-[10px] font-light text-black max-w-80 text-wrap">
                                {ligne.voitureModel?.description || "N/A"}
                              </p>
                              {ligne.couleur && (
                                <div>
                                  <p className="text-[10px] font-normal text-amber-700">Couleur: {ligne.couleur}</p>
                                  {ligne.transmission && <p className="text-[10px] font-normal text-amber-700">Transmission: {ligne.transmission}</p>}
                                  {ligne.motorisation && <p className="text-[10px] font-normal text-amber-700">Motorisation: {ligne.motorisation}</p>}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-black text-center text-sm">{ligne.nbr_voiture}</TableCell>
                            <TableCell className="text-right text-black text-sm">{formatNumberWithSpaces(Number(ligne.prix_unitaire))}</TableCell>
                            <TableCell className="text-black text-right text-sm pr-6">{formatNumberWithSpaces(Number(ligne.montant_ligne))}</TableCell>
                          </TableRow>
                        ));
                      })}

                      {facture.accessoires && facture.accessoires.length > 0 && facture.accessoires.map((accessoire, accIndex) => (
                        <TableRow key={`${facture.id}-accessoire-${accessoire.id}`} className="bg-white border-b border-orange-200">
                          <TableCell className="text-black font-semibold">{(facture.lignes ? facture.lignes.length : 0) + accIndex + 1}</TableCell>
                          <TableCell className="text-black">
                            {accessoire.image ? (
                              <Image src={accessoire.image} alt={accessoire.nom || "Accessoire"} width={100} height={80} />
                            ) : (<div className="text-xs text-white hidden"></div>)}
                          </TableCell>
                         
                          <TableCell className="text-black flex flex-col gap-y-1 text-lg font-semibold">
                            {accessoire.nom}
                            {accessoire.description && <p className="text-[10px] font-light text-black max-w-80 text-wrap">{accessoire.description}</p>}
                          </TableCell>

                          <TableCell className="text-black text-center text-sm">{accessoire.quantity || 1}</TableCell>
                          <TableCell className="text-right text-black text-sm">{formatNumberWithSpaces(accessoire.prix)}</TableCell>
                          <TableCell className="text-black text-right text-sm pr-6">{formatNumberWithSpaces(accessoire.prix * (accessoire.quantity || 1))}</TableCell>
                        </TableRow>
                      ))}
                      
                      {facture.accessoire_nom && (!facture.accessoires || facture.accessoires.length === 0) && (
                        <TableRow className="bg-white border-b border-orange-200">
                          <TableCell className="text-black font-semibold">{facture.lignes ? facture.lignes.length + 1 : 1}</TableCell>      
                          <TableCell className="text-black">
                            {(() => {
                              const imagePath = getAccessoireImage(facture.accessoire_nom, accessoires as Array<{ id: string; nom: string; image?: string | null }>);
                              if (!imagePath) return <div className="text-xs text-gray-500">N/A</div>;
                              return <Image src={imagePath} alt={facture.accessoire_nom || "Accessoire"} width={100} height={80} className="object-contain" />;
                            })()}
                          </TableCell>
                          <TableCell className="text-black flex flex-col gap-y-1 text-lg font-semibold">
                            {facture.accessoire_nom}
                            {facture.accessoire_description && (
                              <p className="text-[10px] font-light text-black max-w-80 text-wrap">{facture.accessoire_description}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-black text-center text-sm">{facture.accessoire_nbr || 1}</TableCell>
                          <TableCell className="text-right text-black text-sm">
                            {((facture.accessoire_prix || 0) / (facture.accessoire_nbr || 1)).toLocaleString().replace(/,/g, " ")}
                          </TableCell>
                          <TableCell className="text-black text-right text-sm pr-6">
                            {(facture.accessoire_prix || 0).toLocaleString().replace(/,/g, " ")}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    <TableFooter className="text-sm border-t border-b border-black mt-4">
                      <TableRow className="bg-green-50">
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-right text-black font-semibold">Total HT</TableCell>
                        <TableCell colSpan={5} className="text-right font-medium pr-6 text-black">{formatNumberWithSpaces(facture.total_ht)}</TableCell>
                      </TableRow>

                      {facture.remise !== 0 && (
                      <TableRow className="bg-white">
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-right text-black">Remise ({facture.remise}%)</TableCell>
                        <TableCell colSpan={5} className="text-right font-medium pr-6 text-black">{formatNumberWithSpaces(facture.montant_remise)}</TableCell>
                      </TableRow>
                      )}  
                      {facture.remise !== 0 && (
                      <TableRow className="bg-green-50">
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-right text-black">Montant Net HT</TableCell>
                        <TableCell colSpan={5} className="text-right font-medium pr-6 text-black">{formatNumberWithSpaces(facture.montant_net_ht)}</TableCell>
                      </TableRow>
                      )}
                      <TableRow className="bg-white">
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-right text-black">TVA({facture.tva}%)</TableCell>
                        <TableCell colSpan={5} className="text-right font-medium pr-6 text-black">{formatNumberWithSpaces(facture.montant_tva)}</TableCell>
                      </TableRow>
                      <TableRow className="text-sm bg-green-50">
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-right text-black font-semibold uppercase">Total TTC</TableCell>
                        <TableCell colSpan={5} className="text-right font-medium pr-6 text-black">{formatNumberWithSpaces(facture.total_ttc)}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>

                  <div className="mt-4">
                    <p className="text-sm font-thin text-black">
                      Arrêter la présente facture à la somme de{" "}
                      <span className="font-semibold">{numberToFrench(Math.floor(facture.total_ttc || 0))} francs CFA</span>
                    </p>
                  </div>

                  <div className="flex w-full justify-between mt-12 mb-10 px-8">
                    <div></div>
                    <div className="text-black font-bold text-sm uppercase">Direction Commerciale</div>
                  </div>
                </div>

                <div className="flex flex-col w-full rounded-b-lg text-[9px]">
                  <div className="flex flex-col">
                    <p className="font-bold text-blue-600">Notes</p>
                    <p className="font-semibold">date d&apos;échéance: {new Date(facture.date_echeance).toLocaleDateString()}</p>
                  </div>
                </div>

                {/*footer*/}
                <div className="print-footer flex flex-col w-full bottom-0 right-0 left-0 mt-auto">
                  <div className="flex flex-col w-full mb-2 rounded-b-lg text-[9px]">
                    <p className="font-bold text-orange-600 mt-2">CONDITIONS:</p>
                    <p className="text-black">60% d&apos;accompte à la commande</p>
                    <p className="text-black font-semibold">DELAIS DE PRODUCTION ET DE LIVRAISON: 4 MOIS</p>
                    <p className="text-black">SOLDE à la livraison</p>
                  </div>
                  <div className="flex flex-col items-center w-full justify-center bg-green-50 rounded-b-lg text-[10px] border-t border-black text-black">
                    <p className="font-thin text-center">Abidjan, Cocody – Riviéra Palmerais – 06 BP 1255 Abidjan 06 / Tel : 00225 01 01 04 77 03</p>
                    <p className="font-thin text-center">Email: info@kpandji.com RCCM : CI-ABJ-03-2022-B13-00710 / CC :2213233 – ECOBANK : CI059 01046 121659429001 46</p>
                    <p className="font-thin text-center">kpandjiautomobiles@gmail.com / www.kpandji.com</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center items-center gap-4 mt-6 print-hide">
            <Button onClick={goToPrevPage} disabled={currentPage === 1} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold">
              <ChevronLeft className="w-5 h-5 mr-2" />
              Page Précédente
            </Button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <div
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setCurrentPage(pageNum);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                    currentPage === pageNum
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {pageNum}
                </div>
              ))}
            </div>

            <Button onClick={goToNextPage} disabled={currentPage === totalPages} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold">
              Page Suivante
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[92vh] overflow-y-auto bg-gradient-to-br from-orange-50 via-white to-amber-50">
          <DialogHeader className="space-y-3 pb-4 border-b-2 border-amber-400">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">Lancer la Commande</DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-1">
                  Créer une commande à partir de la facture <span className="font-semibold text-amber-600">#{currentData[0]?.id.slice(-7)}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-5 py-6">
            {/* Facture & Client Information */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-gray-900">Informations Facture & Client</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 font-medium flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Numéro de Facture
                  </Label>
                  <div className="text-sm font-bold text-gray-900 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                    #{currentData[0]?.id.slice(-7)}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 font-medium flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Client
                  </Label>
                  <div className="text-sm font-semibold text-gray-900 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                    {currentData[0]?.client?.nom || currentData[0]?.clientEntreprise?.nom_entreprise || "Non spécifié"}
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-4">
                <Car className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-base text-gray-900">Informations Véhicule</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 font-medium">Modèle de Véhicule</Label>
                  <div className="text-base font-bold text-gray-900 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-3 rounded-lg border-2 border-orange-300">
                    {currentData[0]?.lignes?.[0]?.voitureModel?.model || currentData[0]?.voiture?.voitureModel?.model || "Non spécifié"}
                  </div>
                </div>
                {(currentData[0]?.lignes?.[0]?.voitureModel?.description || currentData[0]?.voiture?.voitureModel?.description) && (
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500 font-medium">Description</Label>
                    <div className="text-xs text-gray-700 bg-gray-50 px-4 py-3 rounded-lg border border-gray-200 leading-relaxed">
                      {currentData[0]?.lignes?.[0]?.voitureModel?.description || currentData[0]?.voiture?.voitureModel?.description}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Commande Details Form */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 shadow-sm border-2 border-amber-300">
              <div className="flex items-center gap-2 mb-5">
                <Cog className="w-5 h-5 text-amber-700" />
                <h3 className="font-bold text-base text-gray-900">Configuration de la Commande</h3>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* Couleur */}
                <div className="space-y-2">
                  <Label htmlFor="couleur" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-amber-600" />
                    Couleur
                  </Label>
                  <Input
                    id="couleur"
                    value={formData.couleur}
                    onChange={(e) => setFormData({ ...formData, couleur: e.target.value })}
                    className="bg-white border-2 border-amber-300 focus:border-amber-500 focus:ring-amber-500"
                    placeholder="Ex: Blanc, Noir, Rouge..."
                    required
                  />
                </div>

                {/* Nombre de portes */}
                <div className="space-y-2">
                  <Label htmlFor="nbr_portes" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <DoorClosed className="w-4 h-4 text-amber-600" />
                    Nombre de portes
                  </Label>
                  <Select
                    value={formData.nbr_portes}
                    onValueChange={(value) => setFormData({ ...formData, nbr_portes: value })}
                  >
                    <SelectTrigger className="bg-white border-2 border-amber-300 focus:border-amber-500 focus:ring-amber-500">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">🚗 2 portes</SelectItem>
                      <SelectItem value="4">🚙 4 portes</SelectItem>
                      <SelectItem value="5">🚐 5 portes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Transmission */}
                <div className="space-y-2">
                  <Label htmlFor="transmission" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Cog className="w-4 h-4 text-amber-600" />
                    Transmission
                  </Label>
                  <Select
                    value={formData.transmission}
                    onValueChange={(value: "AUTOMATIQUE" | "MANUEL") => setFormData({ ...formData, transmission: value })}
                  >
                    <SelectTrigger className="bg-white border-2 border-amber-300 focus:border-amber-500 focus:ring-amber-500">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUTOMATIQUE">⚙️ Automatique</SelectItem>
                      <SelectItem value="MANUEL">🔧 Manuel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Motorisation */}
                <div className="space-y-2">
                  <Label htmlFor="motorisation" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-600" />
                    Motorisation
                  </Label>
                  <Select
                    value={formData.motorisation}
                    onValueChange={(value: "ELECTRIQUE" | "ESSENCE" | "DIESEL" | "HYBRIDE") => setFormData({ ...formData, motorisation: value })}
                  >
                    <SelectTrigger className="bg-white border-2 border-amber-300 focus:border-amber-500 focus:ring-amber-500">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ESSENCE">⛽ Essence</SelectItem>
                      <SelectItem value="DIESEL">🛢️ Diesel</SelectItem>
                      <SelectItem value="ELECTRIQUE">⚡ Électrique</SelectItem>
                      <SelectItem value="HYBRIDE">🔋 Hybride</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date de livraison */}
                <div className="space-y-2">
                  <Label htmlFor="date_livraison" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    Date de livraison
                  </Label>
                  <Input
                    id="date_livraison"
                    type="date"
                    value={formData.date_livraison}
                    onChange={(e) => setFormData({ ...formData, date_livraison: e.target.value })}
                    className="bg-white border-2 border-amber-300 focus:border-amber-500 focus:ring-amber-500"
                    required
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Étape Commande */}
                <div className="space-y-2">
                  <Label htmlFor="etapeCommande" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-600" />
                    Étape de la commande
                  </Label>
                  <Select
                    value={formData.etapeCommande}
                    onValueChange={(value: "PROPOSITION" | "VALIDE" | "TRANSITE" | "RENSEIGNEE" | "ARRIVE" | "VERIFIER" | "MONTAGE" | "TESTE" | "PARKING" | "CORRECTION" | "VENTE" | "DECHARGE") => setFormData({ ...formData, etapeCommande: value })}
                  >
                    <SelectTrigger className="bg-white border-2 border-amber-300 focus:border-amber-500 focus:ring-amber-500">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PROPOSITION">📋 Proposition</SelectItem>
                        
                      </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t-2 border-amber-300 pt-4 gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
              className="border-2 border-gray-300 hover:bg-gray-100 font-semibold"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleSubmitCommande} 
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg hover:shadow-xl transition-all px-6"
            >
              <Package className="w-4 h-4 mr-2" />
              Créer la Commande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAttribuerDialogOpen} onOpenChange={setIsAttribuerDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[92vh] overflow-y-auto bg-gradient-to-br from-orange-50 via-white to-amber-50">
          <DialogHeader className="space-y-3 pb-4 border-b-2 border-amber-400">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">Attribuer une Commande</DialogTitle>
                <DialogDescription className="text-sm text-gray-600 mt-1">
                  Sélectionnez une commande disponible pour la facture <span className="font-semibold text-amber-600">#{currentData[0]?.id.slice(-7)}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid gap-5 py-6">
            {/* Client Information */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-base text-gray-900">Client</h3>
              </div>
              <div className="text-sm font-semibold text-gray-900 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
                {currentData[0]?.client?.nom || currentData[0]?.clientEntreprise?.nom_entreprise || "Non spécifié"}
              </div>
            </div>

            {/* Available Commandes */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Car className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-base text-gray-900">Commandes Disponibles</h3>
              </div>
              
              {commandesDisponibles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Aucune commande disponible</p>
                  <p className="text-sm mt-1">Il n&apos;y a pas de commandes disponibles pour le moment.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {commandesDisponibles.map((commande) => (
                    <div
                      key={commande.id}
                      onClick={() => setSelectedCommandeId(commande.id)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedCommandeId === commande.id
                          ? "border-amber-500 bg-amber-50 shadow-md"
                          : "border-gray-200 hover:border-amber-300 hover:bg-amber-25"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              selectedCommandeId === commande.id
                                ? "border-amber-500 bg-amber-500"
                                : "border-gray-300"
                            }`}>
                              {selectedCommandeId === commande.id && (
                                <div className="w-full h-full flex items-center justify-center">
                                  <div className="w-2 h-2 bg-white rounded-full"></div>
                                </div>
                              )}
                            </div>
                            <h4 className="font-bold text-gray-900">
                              {commande.voitureModel?.model || "Modèle non spécifié"}
                            </h4>
                          </div>
                          <div className="ml-6 space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Palette className="w-3 h-3" />
                              <span>Couleur: <span className="font-medium uppercase">{commande.couleur}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Cog className="w-3 h-3" />
                              <span>Transmission: <span className="font-medium">{commande.transmission}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Zap className="w-3 h-3" />
                              <span>Motorisation: <span className="font-medium">{commande.motorisation}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              <span>Date de livraison: <span className="font-medium">{new Date(commande.date_livraison).toLocaleDateString()}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Layers className="w-3 h-3" />
                              <span>Étape: <span className="font-medium">{commande.etapeCommande}</span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t-2 border-amber-300 pt-4 gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAttribuerDialogOpen(false);
                setSelectedCommandeId("");
              }}
              className="border-2 border-gray-300 hover:bg-gray-100 font-semibold"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleSubmitAttribution}
              disabled={!selectedCommandeId}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold shadow-lg hover:shadow-xl transition-all px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Package className="w-4 h-4 mr-2" />
              Attribuer la Commande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}