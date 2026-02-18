"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
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
import { getFactureById } from "@/lib/actions/facture";
import { getAllAccessoires } from "@/lib/actions/accessoire";
import { toast } from "sonner";
import { formatNumberWithSpaces } from "@/lib/utils";

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
  client: {
    nom: string;
    telephone?: string;
    entreprise?: string;
    localisation?: string;
  } | null;
  clientEntreprise: {
    nom_entreprise: string;
    telephone?: string;
    localisation?: string;
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

export default function ImpotPage() {
  const router = useRouter();
  const params = useParams();
  const factureId = params.id as string;
  
  const [facture, setFacture] = useState<Facture | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessoires, setAccessoires] = useState<
    Array<{ id: string; nom: string; image?: string | null }>
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [factureResult, accessoiresResult] = await Promise.all([
        getFactureById(factureId),
        getAllAccessoires(),
      ]);

      if (factureResult.success && factureResult.data) {
        setFacture(factureResult.data as Facture);
      } else {
        toast.error("Erreur lors du chargement de la facture");
      }

      if (accessoiresResult.success && accessoiresResult.data) {
        setAccessoires(accessoiresResult.data);
      }
      setLoading(false);
    };
    fetchData();
  }, [factureId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!facture) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <p className="text-center text-gray-500">
            Facture introuvable
          </p>
        </div>
      </div>
    );
  }

  const lignes =
    facture.lignes && facture.lignes.length > 0
      ? facture.lignes
      : [
          {
            id: "1",
            voitureModelId: "",
            couleur: "",
            nbr_voiture: facture.nbr_voiture_commande,
            prix_unitaire: facture.prix_unitaire,
            montant_ligne: facture.montant_ht,
            transmission: "",
            motorisation: "",
            voitureModel: facture.voiture?.voitureModel || null,
          },
        ];

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
          .bg-gradient-to-r,
          .bg-gradient-to-br,
          .bg-black,
          .bg-white,
          .bg-amber-50,
          .bg-amber-100,
          .bg-amber-400,
          .bg-amber-500,
          .bg-amber-600,
          .bg-orange-50,
          .bg-orange-100,
          .bg-orange-200,
          .bg-orange-400,
          .bg-orange-500,
          .bg-gray-900,
          .text-amber-400,
          .text-orange-400,
          .text-orange-600,
          .text-black,
          .border-amber-500,
          .border-amber-600,
          .border-orange-600,
          .border-black {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          @page {
            size: A4;
            margin: 1cm;
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
                onClick={() => router.push("/comptable/facture")}
                className="bg-black hover:bg-gray-800 text-amber-400 font-bold border-2 border-amber-500 shadow-lg"
              >
                RETOUR
              </Button>
              <Button
                onClick={handlePrint}
                className="bg-black hover:bg-gray-800 text-amber-400 font-bold border-2 border-amber-500 shadow-lg"
              >
                IMPRIMER
              </Button>
            </div>
          </div>

          <div id="printable-area">
           

            <div>
              <div>
                <div className="flex items-end justify-between w-full text-sm font-semibold text-gray-600 gap-x-2 mt-60">
                  <div></div>
                  <div className="flex text-sm text-black gap-x-2">
                    <p>Date:</p>
                    <p>
                      {new Date(facture.date_facture).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              

              <div className="flex w-full justify-between mt-16 mb-7">
                

                <div className=" text-black font-semibold text-2xl ">
                  <div className="text-xl font-bold">
                    DOIT :
                  </div>
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
                      <TableHead className="text-black-600 font-bold">
                        #
                      </TableHead>
                      <TableHead className="text-black-600 font-bold">
                        Véhicule
                      </TableHead>
                      <TableHead className="text-black-600 font-bold">
                        Description
                      </TableHead>
                      <TableHead className="text-black-600 font-bold text-center">
                        Quantité
                      </TableHead>
                      <TableHead className="text-black-600 font-bold text-right ">
                        Prix Unitaire HT FCFA
                      </TableHead>
                      <TableHead className="text-right text-black-600 font-bold">
                        Total HT FCFA
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lignes.map((ligne, index) => (
                      <TableRow
                        key={ligne.id}
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
                          <p className="text-[10px] font-light text-black max-w-80 text-wrap">
                            {ligne.voitureModel?.description || "N/A"}
                          </p>
                          {ligne.couleur && (
                            <div>
                              <p className="text-[10px] font-normal text-amber-700">
                                Couleur: {ligne.couleur}
                              </p>
                              {ligne.transmission && (
                                <p className="text-[10px] font-normal text-amber-700">
                                  Transmission: {ligne.transmission}
                                </p>
                              )}
                              {ligne.motorisation && (
                                <p className="text-[10px] font-normal text-amber-700">
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
                    ))}

                    {/* Accessories */}
                    {facture.accessoires && facture.accessoires.length > 0 &&
                      facture.accessoires.map((accessoire, accIndex) => (
                        <TableRow
                          key={`${facture.id}-accessoire-${accessoire.id}`}
                          className="bg-white border-b border-orange-200"
                        >
                          <TableCell className="text-black font-semibold">
                            {(facture.lignes ? facture.lignes.length : 0) +
                              accIndex +
                              1}
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
                              <p className="text-[10px] font-light text-black max-w-80 text-wrap">
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
                            {formatNumberWithSpaces(
                              accessoire.prix * (accessoire.quantity || 1)
                            )}
                          </TableCell>
                        </TableRow>
                      ))}

                    {/* Legacy single accessoire support */}
                    {facture.accessoire_nom &&
                      (!facture.accessoires ||
                        facture.accessoires.length === 0) && (
                        <TableRow className="bg-white border-b border-orange-200">
                          <TableCell className="text-black font-semibold">
                            {facture.lignes ? facture.lignes.length + 1 : 1}
                          </TableCell>
                          <TableCell className="text-black">
                            {(() => {
                              const imagePath = getAccessoireImage(
                                facture.accessoire_nom,
                                accessoires as Array<{
                                  id: string;
                                  nom: string;
                                  image?: string | null;
                                }>
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
                      <TableCell className="text-right text-black font-semibold ">
                        Total HT
                      </TableCell>
                      <TableCell
                        colSpan={5}
                        className="text-right font-medium pr-6 text-black "
                      >
                        {formatNumberWithSpaces(facture.total_ht)}
                      </TableCell>
                    </TableRow>

                    {facture.remise !== 0 && (
                      <TableRow className="bg-white">
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-center text-black font-bold"></TableCell>
                        <TableCell className="text-right text-black ">
                          Remise ({facture.remise}%)
                        </TableCell>
                        <TableCell
                          colSpan={5}
                          className="text-right font-medium pr-6 text-black "
                        >
                          {formatNumberWithSpaces(facture.montant_remise)}
                        </TableCell>
                      </TableRow>
                    )}
                    {facture.remise !== 0 && (
                    <TableRow className="bg-green-50">
                      <TableCell className="text-center text-black font-bold"></TableCell>
                      <TableCell className="text-center text-black font-bold"></TableCell>
                      <TableCell className="text-center text-black font-bold"></TableCell>
                      <TableCell className="text-center text-black font-bold"></TableCell>
                      <TableCell className="text-right text-black ">
                        Montant Net HT
                      </TableCell>
                      <TableCell
                        colSpan={5}
                        className="text-right font-medium pr-6 text-black "
                        >
                        {formatNumberWithSpaces(facture.montant_net_ht)}
                      </TableCell>
                    </TableRow>
                    )}
                    <TableRow className="bg-white">
                      <TableCell className="text-center text-black font-bold"></TableCell>
                      <TableCell className="text-center text-black font-bold"></TableCell>
                      <TableCell className="text-center text-black font-bold"></TableCell>
                      <TableCell className="text-center text-black font-bold"></TableCell>
                      <TableCell className="text-right text-black ">
                        TVA({facture.tva}%)
                      </TableCell>
                      <TableCell
                        colSpan={5}
                        className="text-right font-medium pr-6 text-black  "
                      >
                        {formatNumberWithSpaces(facture.montant_tva)}
                      </TableCell>
                    </TableRow>

                    <TableRow className="text-sm bg-green-50">
                      <TableCell className="text-center text-black font-bold"></TableCell>
                      <TableCell className="text-center text-black font-bold"></TableCell>
                      <TableCell className="text-center text-black font-bold"></TableCell>
                      <TableCell className="text-center text-black font-bold"></TableCell>
                      <TableCell className="text-right text-black font-semibold uppercase">
                        Total TTC
                      </TableCell>
                      <TableCell
                        colSpan={5}
                        className="text-right font-medium pr-6 text-black "
                      >
                        {formatNumberWithSpaces(facture.total_ttc)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>

                <div className="mt-4 ">
                  <p className="text-sm font-thin text-black">
                    Arrêter la présente facture à la somme de{" "}
                    <span className=" font-semibold">
                      {numberToFrench(Math.floor(facture.total_ttc || 0))} francs
                      CFA
                    </span>
                  </p>
                </div>

                <div className="flex w-full justify-between mt-16 mb-20 px-8">
                  <div></div>
                  <div className="text-black font-bold text-sm uppercase">
                    LA DIRECTION
                  </div>
                </div>
              </div>

              
            </div>

           

          </div>
        </div>
      </div>
    </>
  );
}

