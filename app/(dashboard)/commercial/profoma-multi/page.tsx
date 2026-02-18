"use client";

import { useState, useEffect, useRef } from "react";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getFacturesByUser, deleteFacture } from "@/lib/actions/facture";
import { getAllAccessoires } from "@/lib/actions/accessoire";
import { getUserSignature } from "@/lib/actions/signature";
import { toast } from "sonner";
import { formatNumberWithSpaces } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";



const MILLIARD = 1000000000; // 10^9
const BILLION = 1000000000000; // 10^12

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
  if (num < MILLIARD) {
    const million = Math.floor(num / 1000000);
    const rest = num % 1000000;
    return numberToFrench(million) + " million" + (million > 1 ? "s" : "") + (rest ? " " + numberToFrench(rest) : "");
  }
  if (num < BILLION) {
    const milliard = Math.floor(num / MILLIARD);
    const rest = num % MILLIARD;
    return numberToFrench(milliard) + " milliard" + (milliard > 1 ? "s" : "") + (rest ? " " + numberToFrench(rest) : "");
  }
  const billion = Math.floor(num / BILLION);
  const rest = num % BILLION;
  return numberToFrench(billion) + " billion" + (billion > 1 ? "s" : "") + (rest ? " " + numberToFrench(rest) : "");
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
  const { userId: clerkId } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 1;
  const [factures, setFactures] = useState<Facture[]>([]);
  const [accessoires, setAccessoires] = useState<Array<{ id: string; nom: string; image?: string | null }>>([]);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const paginationScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!clerkId) return;
      
      const [facturesResult, accessoiresResult] = await Promise.all([
        getFacturesByUser(clerkId),
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
  }, [clerkId]);

  const totalPages = Math.ceil(factures.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = factures.slice(startIndex, endIndex);

  const handlePrint = () => window.print();
  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToPrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));

  // Calculate which 9 pages to show
  const getVisiblePages = () => {
    const maxVisible = 9;
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    // Adjust start if we're near the end
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  // Scroll to current page when it changes
  useEffect(() => {
    if (paginationScrollRef.current) {
      const pageElement = paginationScrollRef.current.querySelector(`[data-page="${currentPage}"]`) as HTMLElement;
      if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentPage]);

  const handleDelete = async () => {
    const currentFacture = currentData[0];
    if (!currentFacture || !clerkId) return;

    if (confirm(`Êtes-vous sûr de vouloir supprimer cette facture (${currentFacture.id.slice(-7)}) ?`)) {
      const result = await deleteFacture(currentFacture.id);
      if (result.success) {
        toast.success("Facture supprimée avec succès");
        const updatedFactures = await getFacturesByUser(clerkId);
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

  const handleSignature = async () => {
    if (showSignature) {
      setShowSignature(false);
      return;
    }

    const result = await getUserSignature();
    if (result.success && result.data) {
      setSignatureImage(result.data.image);
      setShowSignature(true);
      toast.success("Signature ajoutée au proforma");
    } else {
      toast.error("Aucune signature trouvée. Veuillez d'abord créer votre signature.");
      router.push("./signature");
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
            width: 215mm !important;
            padding: 5mm 10mm 50mm 10mm !important;
            margin: 0 !important;
            box-sizing: border-box !important;
            background: white !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .print-hide { display: none !important; }
          
          /* Page setup */
          @page {
            size: A4;
            margin: 0 !important;
          }
          
          /* Header - appears only on first page */
          #printable-area > div:first-child {
            margin-bottom: 3mm !important;
            padding-bottom: 3mm !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Facture containers - allow breaking across pages */
          #printable-area > div:not(:first-child) {
            page-break-before: auto !important;
            page-break-inside: auto !important;
            display: flex !important;
            flex-direction: column !important;
            min-height: 0 !important;
            position: relative !important;
          }
          
          /* Facture info sections (date, title, client info) - keep with header on first page */
          #printable-area > div:not(:first-child) > div:first-child,
          #printable-area > div:not(:first-child) > div:nth-child(2),
          #printable-area > div:not(:first-child) > div:nth-child(3) {
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Table container - allow breaking */
          #printable-area > div:not(:first-child) > div.mb-2 {
            page-break-inside: auto !important;
            margin-bottom: 8mm !important;
            flex: 1 !important;
          }
          
          /* Page break after every 3rd item */
          .page-break-after {
            page-break-after: always !important;
          }
          
          /* Footer sections container - stick to bottom */
          #printable-area > div:not(:first-child) > div.mt-4,
          #printable-area > div:not(:first-child) > div.flex.w-full.justify-between.mt-5,
          #printable-area > div:not(:first-child) > div.flex.flex-col.w-full.rounded-b-lg,
          #printable-area > div:not(:first-child) > div.print-footer {
            margin-top: auto !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Footer - stick to bottom of each page */
          .print-footer {
            position: fixed !important;
            bottom: 0 !important;
            left: 10mm !important;
            right: 10mm !important;
            width: calc(100% - 20mm) !important;
            padding-top: 5mm !important;
            padding-bottom: 5mm !important;
            background: white !important;
            page-break-inside: avoid !important;
            z-index: 1000 !important;
            margin-top: 0 !important;
          }
          
          /* Table footer - keep with other footer sections */
          tfoot {
            display: table-footer-group !important;
            page-break-before: avoid !important;
          }
          
          /* Typography - optimized for A4 */
          #printable-area h1 {
            font-size: 20px !important;
            margin: 1mm 0 !important;
            line-height: 1.2 !important;
            page-break-after: avoid;
          }
          #printable-area h2 {
            font-size: 18px !important;
            margin: 1.5mm 0 !important;
            page-break-after: avoid;
          }
          #printable-area p {
            font-size: 11px !important;
            margin: 0.5mm 0 !important;
            line-height: 1.3 !important;
          }
          
          /* Table wrapper - allow breaking */
          div.mb-4 {
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
            page-break-inside: auto !important;
          }
          
          /* Table styles - optimized for A4, allow breaking */
          table {
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            font-size: 9px !important;
            margin: 3mm 0 !important;
            display: table !important;
            page-break-inside: auto !important;
          }
          
          /* Table header - repeat on each page */
          thead {
            display: table-header-group !important;
          }
          thead tr {
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          
          tbody {
            display: table-row-group !important;
          }
          
          /* Table footer - appear on last page only */
          tfoot {
            display: table-footer-group !important;
            page-break-before: avoid !important;
          }
          tfoot tr {
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          tfoot tr:last-child {
            page-break-after: avoid !important;
          }
          
          /* Table rows - allow breaking across pages */
          tr {
            page-break-inside: auto !important;
            page-break-after: auto !important;
            display: table-row !important;
          }
          
          /* Table body rows - explicitly allow breaking */
          tbody tr {
            page-break-inside: auto !important;
            page-break-after: auto !important;
          }
          
          /* Prevent breaking inside individual cells */
          th, td {
            padding: 2px 1px !important;
            font-size: 9px !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            vertical-align: top !important;
            line-height: 1.2 !important;
            display: table-cell !important;
            max-width: 0 !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
          }
          
          /* Table cells with flex content */
          td.flex {
            display: table-cell !important;
          }
          td.flex > * {
            display: flex !important;
          }
          th {
            font-size: 8px !important;
            font-weight: bold !important;
            padding: 5px 3px !important;
          }
          
          /* Column widths - optimized for A4 */
          th:nth-child(1), td:nth-child(1) { 
            width: 4% !important; 
            min-width: 15px !important;
            max-width: 4% !important;
          }
          th:nth-child(2), td:nth-child(2) { 
            width: 12% !important; 
            min-width: 50px !important;
            max-width: 12% !important;
          }
          th:nth-child(3), td:nth-child(3) { 
            width: 38% !important; 
            min-width: 120px !important;
            max-width: 38% !important;
          }
          th:nth-child(4), td:nth-child(4) { 
            width: 8% !important; 
            min-width: 35px !important;
            max-width: 8% !important;
          }
          th:nth-child(5), td:nth-child(5) { 
            width: 18% !important; 
            min-width: 70px !important;
            max-width: 18% !important;
          }
          th:nth-child(6), td:nth-child(6) { 
            width: 20% !important; 
            min-width: 75px !important;
            max-width: 20% !important;
          }
          
          /* Images - smaller for print */
          img {
            max-width: 70px !important;
            max-height: 60px !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain !important;
          }
          
          /* Text sizes - optimized for print */
          .text-2xl { font-size: 18px !important; }
          .text-xl { font-size: 16px !important; }
          .text-lg { font-size: 14px !important; }
          .text-sm { font-size: 10px !important; }
          .text-xs { font-size: 9px !important; }
          .text-\[10px\] { font-size: 7px !important; }
          .text-\[9px\] { font-size: 6px !important; }
          .text-\[7px\] { font-size: 5px !important; }
          
          /* Spacing - optimized for A4 */
          .mb-3 { margin-bottom: 2mm !important; }
          .mb-4 { margin-bottom: 3mm !important; }
          .mb-6 { margin-bottom: 4mm !important; }
          .mb-10 { margin-bottom: 6mm !important; }
          .mt-12 { margin-top: 4mm !important; }
          .my-4 { margin-top: 2mm !important; margin-bottom: 2mm !important; }
          .pb-4 { padding-bottom: 3mm !important; }
          .px-4 { padding-left: 3mm !important; padding-right: 3mm !important; }
          .py-2 { padding-top: 1.5mm !important; padding-bottom: 1.5mm !important; }
          .gap-x-2 { gap: 1.5mm !important; }
          .gap-y-1 { gap: 1mm !important; }
          .gap-2 { gap: 1.5mm !important; }
          
          /* Negative margins */
          .-mb-14 { margin-bottom: -2mm !important; }
          
          /* Flex fixes */
          .flex { display: flex !important; }
          .flex-col { flex-direction: column !important; }
          .justify-between { justify-content: space-between !important; }
          .justify-center { justify-content: center !important; }
          .items-center { align-items: center !important; }
          .items-end { align-items: flex-end !important; }
          .w-full { width: 100% !important; }
          
          /* Borders */
          .border { border-width: 1px !important; }
          .border-b { border-bottom-width: 1px !important; }
          .border-b-4 { border-bottom-width: 1.5px !important; }
          .border-t { border-top-width: 1px !important; }
          .border-black { border-color: black !important; }
          .border-amber-600 { border-color: #d97706 !important; }
          .border-orange-200 { border-color: #fed7aa !important; }
          
          /* Rounded corners */
          .rounded-lg { border-radius: 3px !important; }
          
          /* Overflow */
          .overflow-hidden { overflow: hidden !important; }
          .overflow-x-auto { overflow: visible !important; }
          
          /* Prevent page breaks in critical sections */
          .font-bold { page-break-after: avoid; }
        }
      ` }} />
      
      <div className="flex flex-col w-full bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="flex w-full justify-between mb-6 print-hide">
            <div className="flex gap-4">
              <Button onClick={() => router.push("./creerFacture")} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold shadow-lg">
                CREER PROFORMA
              </Button>
              <Button onClick={handlePrint} className="bg-black hover:bg-gray-800 text-amber-400 font-bold border-2 border-amber-500 shadow-lg">
                IMPRIMER
              </Button>
              <Button onClick={() => { const currentFacture = currentData[0]; if (currentFacture) router.push(`./creerFacture?id=${currentFacture.id}&mode=edit`); }} disabled={currentData.length === 0} className="bg-black hover:bg-gray-800 text-amber-400 font-bold border-2 border-amber-500 shadow-lg disabled:opacity-50">
                MODIFIER
              </Button>
              <Button onClick={handleDelete} disabled={currentData.length === 0} className="bg-black hover:bg-gray-800 text-amber-400 font-bold border-2 border-amber-500 shadow-lg disabled:opacity-50">
                SUPPRIMER
              </Button>
              <Button onClick={handleSignature} disabled={currentData.length === 0} className="bg-black hover:bg-gray-800 text-amber-400 font-bold border-2 border-amber-500 shadow-lg disabled:opacity-50">
                {showSignature ? "RETIRER SIGNATURE" : "SIGNER"}
              </Button>
            </div>
          </div>

          <div id="printable-area">
            {/* Header */}
            <div className="flex w-full justify-between border-b-4 border-amber-600 pb-4 mb-3">
              <div>
                <Image src="/logo.png" alt="Logo" width={100} height={50} priority />
              </div>
              <div className="flex flex-col justify-center -mb-14">
                <h1 className="text-2xl font-bold text-black">
                  KPANDJI AUTOMOBILES
                </h1>
                <p className="text-sm text-gray-800 font-thin">
                  Constructeur et Assembleur Automobile
                </p>
              </div>
            </div>

            {/* Factures */}
            {currentData.map((facture: Facture) => (
              <div key={facture.id}>
                <div className="flex items-end justify-between w-full text-sm font-semibold text-gray-600 gap-x-2">
                  <div></div>
                  <div className="flex text-sm text-black gap-x-2">
                    <p>Date:</p>
                    <p>{new Date(facture.date_facture).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex w-full justify-center my-2">
                  <h1 className="text-xl font-bold text-black border border-black px-4 py-2 rounded-lg">
                    FACTURE {facture.status_facture}
                  </h1>
                </div>

                <div className="flex w-full justify-between mb-2">
                  <div className="text-black font-semibold text-2xl">
                    <div className="flex text-xs text-gray-900 gap-x-2 font-bold">
                      <p>Numéro de Proforma:</p>
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

                <div className="mb-2">
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
                      {(() => {
                        // Combine all items (lignes + accessoires) into one array
                        const lignes = facture.lignes && facture.lignes.length > 0
                          ? facture.lignes
                          : [{
                              id: "1",
                              voitureModelId: "",
                              couleur: "",
                              nbr_voiture: facture.nbr_voiture_commande,
                              prix_unitaire: facture.prix_unitaire,
                              montant_ligne: facture.montant_ht,
                              transmission: "",
                              motorisation: "",
                              voitureModel: facture.voiture?.voitureModel || null,
                            }];

                        type TableItem = {
                          type: 'ligne';
                          data: typeof lignes[0];
                          index: number;
                        } | {
                          type: 'accessoire';
                          data: NonNullable<typeof facture.accessoires>[0];
                          index: number;
                        } | {
                          type: 'accessoire_nom';
                          data: typeof facture;
                          index: number;
                        };
                        
                        const allItems: TableItem[] = [];

                        // Add lignes
                        lignes.forEach((ligne, idx) => {
                          allItems.push({ type: 'ligne', data: ligne, index: idx });
                        });

                        // Add accessoires
                        if (facture.accessoires && facture.accessoires.length > 0) {
                          facture.accessoires.forEach((accessoire, idx) => {
                            allItems.push({ type: 'accessoire', data: accessoire, index: idx });
                          });
                        }

                        // Add single accessoire_nom if exists
                        if (facture.accessoire_nom && (!facture.accessoires || facture.accessoires.length === 0)) {
                          allItems.push({ type: 'accessoire_nom', data: facture, index: 0 });
                        }

                        return allItems.map((item, globalIndex) => {
                          const isThirdItem = (globalIndex + 1) % 3 === 0;
                          const rowClass = globalIndex % 2 === 0 
                            ? `bg-white border-b border-orange-200 ${isThirdItem ? 'page-break-after' : ''}`
                            : `bg-white hover:bg-orange-50 border-b border-orange-200 ${isThirdItem ? 'page-break-after' : ''}`;

                          if (item.type === 'ligne') {
                            const ligne = item.data;
                            return (
                              <TableRow key={`${facture.id}-ligne-${ligne.id}`} className={rowClass}>
                                <TableCell className="text-black font-semibold">{globalIndex + 1}</TableCell>
                                <TableCell className="text-black">
                                  {ligne.voitureModel?.image ? (
                                    <Image 
                                      src={ligne.voitureModel.image} 
                                      alt={ligne.voitureModel.model || "Vehicle"} 
                                      width={110} 
                                      height={90}
                                      unoptimized
                                      className="object-contain"
                                    />
                                  ) : "N/A"}
                                </TableCell>
                                <TableCell className="text-black flex flex-col gap-y-1 text-lg font-semibold">
                                  {ligne.voitureModel?.model || "N/A"}
                                  <p className="text-[10px] font-normal text-black w-full text-wrap">{ligne.voitureModel?.description || "N/A"}</p>
                                  {ligne.couleur && (
                                    <div className="flex gap-x-2" style={{ display: "flex!important" }}>
                                      <p style={{ display: "flex" }} className="text-[10px] font-normal text-amber-700">Couleur: {ligne.couleur}-</p>
                                      {ligne.transmission && (
                                        <p style={{ display: "flex" }} className="text-[10px] font-normal text-amber-700">
                                          Transmission: {ligne.transmission}-
                                        </p>
                                      )}
                                      {ligne.motorisation && (
                                        <p style={{ display: "flex" }} className="text-[10px] font-normal text-amber-700">
                                          Motorisation: {ligne.motorisation}-
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-black text-center text-sm">{ligne.nbr_voiture}</TableCell>
                                <TableCell className="text-right text-black text-sm">{formatNumberWithSpaces(Number(ligne.prix_unitaire))}</TableCell>
                                <TableCell className="text-black text-right text-sm pr-6">{formatNumberWithSpaces(Number(ligne.montant_ligne))}</TableCell>
                              </TableRow>
                            );
                          } else if (item.type === 'accessoire') {
                            const accessoire = item.data;
                            return (
                              <TableRow key={`${facture.id}-accessoire-${accessoire.id}`} className={rowClass}>
                                <TableCell className="text-black font-semibold">{globalIndex + 1}</TableCell>
                                <TableCell className="text-black">
                                  {accessoire.image ? (
                                    <Image 
                                      src={accessoire.image} 
                                      alt={accessoire.nom || "Accessoire"} 
                                      width={100} 
                                      height={80}
                                      unoptimized
                                      className="object-contain"
                                    />
                                  ) : (
                                    <div className="text-xs text-gray-400">Pas d&apos;image</div>
                                  )}
                                </TableCell>
                                <TableCell className="text-black flex flex-col gap-y-1 text-lg font-semibold">
                                  {accessoire.nom}
                                  {accessoire.description && <p className="text-[9px] font-light text-black max-w-80 text-wrap">{accessoire.description}</p>}
                                </TableCell>
                                <TableCell className="text-black text-center text-sm">{accessoire.quantity || 1}</TableCell>
                                <TableCell className="text-right text-black text-sm">{formatNumberWithSpaces(accessoire.prix)}</TableCell>
                                <TableCell className="text-black text-right text-sm pr-6">{formatNumberWithSpaces(accessoire.prix * (accessoire.quantity || 1))}</TableCell>
                              </TableRow>
                            );
                          } else {
                            // accessoire_nom
                            const factureData = item.data;
                            const imagePath = getAccessoireImage(factureData.accessoire_nom, accessoires);
                            return (
                              <TableRow key={`${facture.id}-accessoire-nom`} className={rowClass}>
                                <TableCell className="text-black font-semibold">{globalIndex + 1}</TableCell>      
                                <TableCell className="text-black">
                                  {imagePath ? (
                                    <Image 
                                      src={imagePath} 
                                      alt={factureData.accessoire_nom || "Accessoire"} 
                                      width={100} 
                                      height={80}
                                      unoptimized
                                      className="object-contain"
                                    />
                                  ) : (
                                    <div className="text-xs text-gray-500">Pas d&apos;image</div>
                                  )}
                                </TableCell>
                                <TableCell className="text-black flex flex-col gap-y-1 text-lg font-semibold">
                                  {factureData.accessoire_nom}
                                  {factureData.accessoire_description && <p className="text-[7px] font-light text-black max-w-80 text-wrap">{factureData.accessoire_description}</p>}
                                </TableCell>
                                <TableCell className="text-black text-center text-sm">{factureData.accessoire_nbr || 1}</TableCell>
                                <TableCell className="text-right text-black text-sm">{((factureData.accessoire_prix || 0) / (factureData.accessoire_nbr || 1)).toLocaleString().replace(/,/g, " ")}</TableCell>
                                <TableCell className="text-black text-right text-sm pr-6">{(factureData.accessoire_prix || 0).toLocaleString().replace(/,/g, " ")}</TableCell>
                              </TableRow>
                            );
                          }
                        });
                      })()}
                    </TableBody>
                    <TableFooter className="text-sm border-t border-b border-black mt-4">
                      <TableRow className="bg-green-50">
                        <TableCell colSpan={4}></TableCell>
                        <TableCell className="text-right text-black font-semibold">Total HT</TableCell>
                        <TableCell className="text-right font-medium pr-6 text-black">{formatNumberWithSpaces(facture.total_ht)}</TableCell>
                      </TableRow>
                      {facture.remise !== 0 && (      
                      <TableRow className="bg-white">
                        <TableCell colSpan={4}></TableCell>
                        <TableCell className="text-right text-black">Remise ({facture.remise}%)</TableCell>
                        <TableCell className="text-right font-medium pr-6 text-black">{formatNumberWithSpaces(facture.montant_remise)}</TableCell>
                      </TableRow>
                      )}
                      {facture.remise !== 0 && (
                      <TableRow className="bg-green-50">
                        <TableCell colSpan={4}></TableCell>
                        <TableCell className="text-right text-black">Montant Net HT</TableCell>
                        <TableCell className="text-right font-medium pr-6 text-black">{formatNumberWithSpaces(facture.montant_net_ht)}</TableCell>
                      </TableRow>
                      )}
                      <TableRow className="bg-white">
                        <TableCell colSpan={4}></TableCell>
                        <TableCell className="text-right text-black">TVA({facture.tva}%)</TableCell>
                        <TableCell className="text-right font-medium pr-6 text-black">{formatNumberWithSpaces(facture.montant_tva)}</TableCell>
                      </TableRow>
                      
                      <TableRow className="text-sm bg-green-50">
                        <TableCell colSpan={4}></TableCell>
                        <TableCell className="text-right text-black font-semibold uppercase">Total TTC</TableCell>
                        <TableCell className="text-right font-medium pr-6 text-black">{formatNumberWithSpaces(facture.total_ttc)}</TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>

                  <div className="mt-4">
                    <p className="text-sm font-thin text-black">
                      Arrêter la présente facture à la somme de <span className="font-semibold">{numberToFrench(Math.floor(facture.total_ttc || 0))} francs CFA</span>
                    </p>
                  </div>

                  <div className="flex w-full justify-between mt-5 px-8">
                    <div></div>
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-black font-bold text-sm uppercase">Direction Commerciale</div>
                      {showSignature && signatureImage && (
                        <div className="relative w-48 h-20 -mt-3">
                          <Image 
                            src={signatureImage} 
                            alt="Signature" 
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      )}
                      {showSignature && !signatureImage && (
                        <div className="text-xs text-gray-500 italic">Signature en cours de chargement...</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col w-full rounded-b-lg text-[9px] -mt-18">
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
                    <p className="font-normal text-center">Abidjan, Cocody – Riviéra Palmerais – 06 BP 1255 Abidjan 06 / Tel : 00225 01 01 04 77 03</p>
                    <p className="font-normal text-center">Email: info@kpandji.com RCCM : CI-ABJ-03-2022-B13-00710 / CC :2213233 – ECOBANK : CI059 01046 121659429001 46</p>
                    <p className="font-normal text-center">kpandjiautomobiles@gmail.com / www.kpandji.com</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center items-center gap-4 mt-6 print-hide">
            <Button onClick={goToPrevPage} disabled={currentPage === 1} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold flex-shrink-0">
              <ChevronLeft className="w-5 h-5 mr-2" />
              Page Précédente
            </Button>

            <div ref={paginationScrollRef} className="overflow-x-auto max-w-md scrollbar-hide scroll-smooth">
              <div className="flex items-center gap-2 min-w-max px-2">
                {getVisiblePages().map((pageNum: number) => (
                  <div 
                    key={pageNum} 
                    data-page={pageNum}
                    onClick={() => setCurrentPage(pageNum)} 
                    role="button" 
                    tabIndex={0} 
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setCurrentPage(pageNum); }} 
                    className={`px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer flex-shrink-0 ${currentPage === pageNum ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                  >
                    {pageNum}
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={goToNextPage} disabled={currentPage === totalPages} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold flex-shrink-0">
              Page Suivante
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}