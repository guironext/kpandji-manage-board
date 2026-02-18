"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
import { getFacturesWithBonPourAcquis, convertToFactureWithClientStatus } from "@/lib/actions/facture";
import { getAllAccessoires } from "@/lib/actions/accessoire";
import { formatNumberWithSpaces } from "@/lib/utils";
import { toast } from "sonner";

const numberToFrench = (num: number): string => {
  // Vérifier que num est un nombre valide
  if (num === null || num === undefined || isNaN(num) || !isFinite(num)) {
    return "zéro";
  }
  
  const units = [
    "",
    "un",
    "deux",
    "trois",
    "quatre",
    "cinq",
    "six",
    "sept",
    "huit",
    "neuf",
  ];
  const teens = [
    "dix",
    "onze",
    "douze",
    "treize",
    "quatorze",
    "quinze",
    "seize",
    "dix-sept",
    "dix-huit",
    "dix-neuf",
  ];
  const tens = [
    "",
    "",
    "vingt",
    "trente",
    "quarante",
    "cinquante",
    "soixante",
    "soixante-dix",
    "quatre-vingt",
    "quatre-vingt-dix",
  ];

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
    return (
      (hundred > 1 ? units[hundred] + " " : "") +
      "cent" +
      (hundred > 1 && rest === 0 ? "s" : "") +
      (rest ? " " + numberToFrench(rest) : "")
    );
  }
  if (num < 1000000) {
    const thousand = Math.floor(num / 1000);
    const rest = num % 1000;
    return (
      (thousand > 1 ? numberToFrench(thousand) + " " : "") +
      "mille" +
      (rest ? " " + numberToFrench(rest) : "")
    );
  }
  const million = Math.floor(num / 1000000);
  const rest = num % 1000000;
  return (
    numberToFrench(million) +
    " million" +
    (million > 1 ? "s" : "") +
    (rest ? " " + numberToFrench(rest) : "")
  );
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
  bon_pour_acquis?: boolean;
  clientId?: string | null;
  clientEntrepriseId?: string | null;
  client: {
    nom: string;
    telephone?: string;
    entreprise?: string;
    localisation?: string;
    commercial?: string;
    status_client?: string;
  } | null;
  clientEntreprise: {
    nom_entreprise: string;
    telephone?: string;
    localisation?: string;
    commercial?: string;
    status_client?: string;
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 1;
  const [factures, setFactures] = useState<Facture[]>([]);
  const [accessoires, setAccessoires] = useState<
    Array<{ id: string; nom: string; image?: string | null }>
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      const [facturesResult, accessoiresResult] = await Promise.all([
        getFacturesWithBonPourAcquis(),
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

  const handleTransformToFacture = async () => {
    const currentFacture = currentData[0];
    if (!currentFacture) return;

    const result = await convertToFactureWithClientStatus(currentFacture.id);
    if (result.success) {
      toast.success("Facture transformée avec succès");
      // Refresh the data
      const facturesResult = await getFacturesWithBonPourAcquis();
      if (facturesResult.success && facturesResult.data) {
        setFactures(facturesResult.data as Facture[]);
      }
    } else {
      toast.error("Erreur lors de la transformation");
    }
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area,
          #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print-hide {
            display: none !important;
          }
        }
      `,
        }}
      />

      <div className="flex flex-col w-full bg-gradient-to-br from-amber-50 via-white to-orange-50">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="flex w-full justify-between mb-6 print-hide">
            <div className="flex gap-4">
              <Button
                onClick={handlePrint}
                className="bg-black hover:bg-gray-800 text-amber-400 font-bold border-2 border-amber-500 shadow-lg"
              >
                IMPRIMER
              </Button>
              
              <Button
                onClick={handleTransformToFacture}
                disabled={
                  currentData.length === 0 || 
                  currentData[0]?.status_facture === "FACTURE" ||
                  currentData[0]?.client?.status_client === "PROSPECT" ||
                  currentData[0]?.clientEntreprise?.status_client === "PROSPECT"
                }
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                TRANSFORMER EN FACTURE
              </Button>
            </div>
          </div>

          <div id="printable-area" className="relative">
            {currentData[0]?.bon_pour_acquis && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50" style={{ transform: 'rotate(-45deg)' }}>
                <div className="text-white font-bold text-5xl opacity-95 whitespace-nowrap w-full text-center" style={{ 
                  textShadow: '4px 4px 8px rgba(0,0,0,0.9)',
                  letterSpacing: '0.3em',
                  fontWeight: '900',
                  width: '200%',
                  left: '-50%'
                }}>
                  BON POUR ACQUIS
                </div>
              </div>
            )}

            <div className="flex w-full justify-between border-b-4 border-amber-600 pb-4 mb-3">
              <div>
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={100}
                  height={50}
                  priority
                />
              </div>
              <div className="flex flex-col justify-center -mb-14">
                <h1 className="text-2xl font-bold text-blac">
                  KPANDJI AUTOMOBILES
                </h1>
                <p className="text-sm text-gray-800 font-thin">
                  Constructeur et Assembleur Automobile
                </p>
              </div>
            </div>

            {currentData.map((facture: Facture) => (
              <div key={facture.id}>
                <div>
                  <div className="flex items-end justify-between w-full text-sm font-semibold text-gray-600 gap-x-2">
                    <div></div>
                    <div className="flex text-sm text-black gap-x-2">
                      <p>Date:</p>
                      <p>
                        {new Date(facture.date_facture).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex w-full justify-center my-8">
                  <h1 className="text-xl font-bold text-black border border-black px-4 py-2 rounded-lg ">
                    FACTURE {facture.status_facture}
                  </h1>
                </div>

                <div className="flex w-full justify-between mb-6">
                  <div className=" text-black font-semibold text-2xl ">
                    <div className="flex text-xs text-gray-900 gap-x-2 font-bold">
                      <p>Numéro de Proforma:</p>
                      <p className="uppercase">{facture.id.slice(-7)} </p>
                    </div>

                    <div className="flex text-xs text-gray-800 gap-x-2">
                      <p>Créé par:</p>
                      <p>
                        {facture.user?.firstName} {facture.user?.lastName}
                      </p>
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

                  <div className=" text-black font-semibold text-2xl ">
                    <div className="flex text-sm font-semibold gap-2">
                      <p>Client:</p>
                      <p>
                        {facture.client?.nom ||
                          facture.clientEntreprise?.nom_entreprise}
                      </p>
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
                      <p>
                        {facture.client?.telephone ||
                          facture.clientEntreprise?.telephone}
                      </p>
                    </div>
                    <div className="flex text-xs text-gray-800 gap-x-2">
                      <p>Localisation:</p>
                      <p>
                        {facture.client?.localisation ||
                          facture.clientEntreprise?.localisation}
                      </p>
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
                        <TableHead className="text-black-600 font-bold text-right ">Prix Unitaire HT FCFA</TableHead>
                        <TableHead className="text-right text-black-600 font-bold">Total HT FCFA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentData.map((factureItem) => {
                        const lignes =
                          factureItem.lignes && factureItem.lignes.length > 0
                            ? factureItem.lignes
                            : [
                                {
                                  id: "1",
                                  voitureModelId: "",
                                  couleur: "",
                                  nbr_voiture: factureItem.nbr_voiture_commande,
                                  prix_unitaire: factureItem.prix_unitaire,
                                  montant_ligne: factureItem.montant_ht,
                                  transmission: "",
                                  motorisation: "",
                                  voitureModel:
                                    factureItem.voiture?.voitureModel || null,
                                },
                              ];

                        return lignes.map((ligne, index) => (
                          <TableRow
                            key={`${factureItem.id}-${ligne.id}`}
                            className={
                              index % 2 === 0
                                ? "bg-white border-b border-orange-200"
                                : "bg-white hover:bg-orange-50 border-b border-orange-200"
                            }
                          >
                            <TableCell className="text-black font-semibold">
                              {index + 1}
                            </TableCell>
                            <TableCell className="text-black">
                              {ligne.voitureModel?.image ? (
                                <Image
                                  src={ligne.voitureModel.image}
                                  alt={ligne.voitureModel.model || "Vehicle"}
                                  width={100}
                                  height={80}
                                />
                              ) : (
                                "N/A"
                              )}
                            </TableCell>
                            <TableCell className="text-black flex flex-col gap-y-1 text-lg font-semibold">
                              {ligne.voitureModel?.model || "N/A"}
                              <p className="text-[7px] font-light text-black max-w-80 text-wrap">
                                {ligne.voitureModel?.description || "N/A"}
                              </p>
                              {ligne.couleur && (
                                <div>
                                  <p className="text-[7px] font-normal text-amber-700">
                                    Couleur: {ligne.couleur}
                                  </p>
                                  {ligne.transmission && (
                                    <p className="text-[7px] font-normal text-amber-700">
                                      Transmission: {ligne.transmission}
                                    </p>
                                  )}
                                  {ligne.motorisation && (
                                    <p className="text-[7px] font-normal text-amber-700">
                                      Motorisation: {ligne.motorisation}
                                    </p>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-black text-center text-sm">
                              {ligne.nbr_voiture}
                            </TableCell>
                            <TableCell className="text-right text-black text-sm">
                              {formatNumberWithSpaces(Number(ligne.prix_unitaire))}
                            </TableCell>
                            <TableCell className="text-black text-right text-sm pr-6">
                              {formatNumberWithSpaces(Number(ligne.montant_ligne))}
                            </TableCell>
                          </TableRow>
                        ));
                      })}

                      {facture.accessoires && facture.accessoires.length > 0 && facture.accessoires.map((accessoire, accIndex) => (
                        <TableRow key={`${facture.id}-accessoire-${accessoire.id}`} className="bg-white border-b border-orange-200">
                          <TableCell className="text-black font-semibold">
                            {(facture.lignes ? facture.lignes.length : 0) + accIndex + 1}
                          </TableCell>
                          <TableCell className="text-black">
                            {accessoire.image ? (
                              <Image
                                src={accessoire.image}
                                alt={accessoire.nom || "Accessoire"}
                                width={100}
                                height={80}
                              />
                            ) : (
                              <div className="text-xs text-white hidden"></div>
                            )}
                          </TableCell>
                          <TableCell className="text-black flex flex-col gap-y-1 text-lg font-semibold">
                            {accessoire.nom}
                            {accessoire.description && (
                              <p className="text-[7px] font-light text-black max-w-80 text-wrap">
                                {accessoire.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-black text-center text-sm">
                            {accessoire.quantity || 1}
                          </TableCell>
                          <TableCell className="text-right text-black text-sm">
                            {formatNumberWithSpaces(accessoire.prix)}
                          </TableCell>
                          <TableCell className="text-black text-right text-sm pr-6">
                            {formatNumberWithSpaces(accessoire.prix * (accessoire.quantity || 1))}
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {facture.accessoire_nom && (!facture.accessoires || facture.accessoires.length === 0) && (
                        <TableRow className="bg-white border-b border-orange-200">
                          <TableCell className="text-black font-semibold">
                            {facture.lignes ? facture.lignes.length + 1 : 1}
                          </TableCell>      
                          <TableCell className="text-black">
                            {(() => {
                              const imagePath = getAccessoireImage(
                                facture.accessoire_nom,
                                accessoires as Array<{ id: string; nom: string; image?: string | null }>
                              );
                              
                              if (!imagePath) {
                                return (
                                  <div className="text-xs text-gray-500">
                                    N/A
                                  </div>
                                );
                              }
                              
                              return (
                                <Image
                                  src={imagePath}
                                  alt={facture.accessoire_nom || "Accessoire"}
                                  width={100}
                                  height={80}
                                  className="object-contain"
                                />
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-black flex flex-col gap-y-1 text-lg font-semibold">
                            {facture.accessoire_nom}
                            {facture.accessoire_description && (
                              <p className="text-[7px] font-light text-black max-w-80 text-wrap">
                                {facture.accessoire_description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-black text-center text-sm">
                            {facture.accessoire_nbr || 1}
                          </TableCell>
                          <TableCell className="text-right text-black text-sm">
                            {(
                              (facture.accessoire_prix || 0) /
                              (facture.accessoire_nbr || 1)
                            )
                              .toLocaleString()
                              .replace(/,/g, " ")}
                          </TableCell>
                          <TableCell className="text-black text-right text-sm pr-6">
                            {(facture.accessoire_prix || 0)
                              .toLocaleString()
                              .replace(/,/g, " ")}
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
                        <TableCell className="text-right text-black font-semibold ">Total HT</TableCell>
                        <TableCell colSpan={5} className="text-right font-medium pr-6 text-black ">
                          {formatNumberWithSpaces(facture.total_ht)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-white">
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-right text-black ">Remise ({facture.remise}%)</TableCell>
                        <TableCell colSpan={5} className="text-right font-medium pr-6 text-black ">
                          {formatNumberWithSpaces(facture.montant_remise)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-green-50">
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-right text-black ">Montant Net HT</TableCell>
                        <TableCell colSpan={5} className="text-right font-medium pr-6 text-black ">
                          {formatNumberWithSpaces(facture.montant_net_ht)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-white">
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-right text-black ">TVA({facture.tva}%)</TableCell>
                        <TableCell colSpan={5} className="text-right font-medium pr-6 text-black  ">
                          {formatNumberWithSpaces(facture.montant_tva)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="text-sm bg-green-50">
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-right text-black font-semibold uppercase">Total TTC</TableCell>
                        <TableCell colSpan={5} className="text-right font-medium pr-6 text-black ">
                          {formatNumberWithSpaces(facture.total_ttc)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>

                  <div className="mt-4 ">
                    <p className="text-sm font-thin text-black">
                      Arrêter la présente facture à la somme de{" "}
                      <span className=" font-semibold">
                        {numberToFrench(Math.floor(facture.total_ttc || 0))} francs CFA
                      </span>
                    </p>
                  </div>

                  <div className="flex w-full justify-between mt-16 mb-20 px-8">
                    <div></div>
                    <div className="text-black font-bold text-sm uppercase">
                      Direction Commerciale
                    </div>
                  </div>
                </div>

                <div className="flex flex-col  w-full  rounded-b-lg text-[9px] ">
                  <div className="flex flex-col">
                    <p className="font-bold text-blue-600">Notes</p>
                    <p className="font-semibold">
                      date d&apos;échéance:{" "}
                      {new Date(facture.date_echeance).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex flex-col w-full bottom-0 right-0 left-0">
              <div className="flex flex-col  w-full mb-2  rounded-b-lg text-[9px]  ">
                <p className="font-bold text-orange-600 mt-2">CONDITIONS:</p>
                <p className="text-black">60% d&apos;accompte à la commande</p>
                <p className="text-black font-semibold">
                  DELAIS DE PRODUCTION ET DE LIVRAISON: 4 MOIS
                </p>
                <p className="text-black">SOLDE à la livraison</p>
              </div>
              <div className="flex flex-col items-center w-full justify-center bg-green-50 rounded-b-lg text-[10px] border-t border-black text-black ">
                <p className=" font-thin text-center">
                  Abidjan, Cocody – Riviéra Palmerais – 06 BP 1255 Abidjan 06 /
                  Tel : 00225 01 01 04 77 03
                </p>
                <p className=" font-thin text-center">
                  Email: info@kpandji.com RCCM : CI-ABJ-03-2022-B13-00710 / CC
                  :2213233 – ECOBANK : CI059 01046 121659429001 46
                </p>
                <p className=" font-thin text-center">
                  kpandjiautomobiles@gmail.com / www.kpandji.com
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center items-center gap-4 mt-6 print-hide">
            <Button
              onClick={goToPrevPage}
              disabled={currentPage === 1}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Page Précédente
            </Button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => (
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
                )
              )}
            </div>

            <Button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold"
            >
              Page Suivante
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}