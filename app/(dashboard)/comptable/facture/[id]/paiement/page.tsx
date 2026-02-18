"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, CreditCard, User, Building, Calendar, DollarSign, FileText, Printer } from "lucide-react";
import { getFactureWithPaiements, createPaiement, generateNumeroEntreeCaisse } from "@/lib/actions/paiement";
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

type Paiement = {
  id: string;
  avance_payee: number;
  reste_payer: number;
  date_paiement: Date | string;
  mode_paiement: "CB" | "CHEQUE" | "VIREMENT" | "CASH";
  status_paiement: "EN_ATTENTE" | "PAYE" | "ANNULE";
  createdAt: Date | string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  numeroEntreeCaisse?: {
    numero: string;
    prefix_numero: string;
  } | null;
};

type FactureData = {
  id: string;
  total_ttc: number;
  avance_payee: number;
  reste_payer: number;
  client: {
    id: string;
    nom: string;
    telephone?: string;
    email?: string;
    entreprise?: string;
    localisation?: string;
    commercial?: string;
  } | null;
  clientEntreprise: {
    id: string;
    nom_entreprise: string;
    telephone?: string;
    email?: string;
    localisation?: string;
    commercial?: string;
  } | null;
  paiements: Paiement[];
  totalPaid: number;
};

export default function PaiementPage() {
  const router = useRouter();
  const params = useParams();
  const factureId = params.id as string;

  const [facture, setFacture] = useState<FactureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    avance_payee: "",
    date_paiement: new Date().toISOString().split("T")[0],
    mode_paiement: "VIREMENT" as "CB" | "CHEQUE" | "VIREMENT" | "CASH",
    status_paiement: "EN_ATTENTE" as "EN_ATTENTE" | "PAYE" | "ANNULE",
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getFactureWithPaiements(factureId);

      if (result.success && result.data) {
        setFacture(result.data as FactureData);
      } else {
        toast.error(result.error || "Erreur lors du chargement des données");
        router.push(`/comptable/facture`);
      }
      setLoading(false);
    };

    fetchData();
  }, [factureId, router]);

  // Format number input with spaces
  const formatAmountInput = (value: string): string => {
    // Remove all non-digit characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, "");
    // Remove multiple decimal points
    const parts = numericValue.split(".");
    if (parts.length > 2) {
      return parts[0] + "." + parts.slice(1).join("");
    }
    // Format integer part with spaces
    if (parts[0]) {
      const formattedInteger = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      return parts.length > 1 ? `${formattedInteger}.${parts[1]}` : formattedInteger;
    }
    return "";
  };

  // Parse formatted amount to number
  const parseAmountInput = (value: string): number => {
    const numericValue = value.replace(/\s/g, "");
    return parseFloat(numericValue) || 0;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAmountInput(e.target.value);
    setFormData({ ...formData, avance_payee: formatted });
  };

  const handlePrintPaiement = async (paiement: Paiement) => {
    if (!facture) return;

    // Generate or get NumeroEntreeCaisse
    let numeroEntreeCaisse = paiement.numeroEntreeCaisse;
    if (!numeroEntreeCaisse) {
      const result = await generateNumeroEntreeCaisse(paiement.id);
      if (result.success && result.data) {
        numeroEntreeCaisse = result.data;
        // Refresh the facture data to get the updated numeroEntreeCaisse
        const refreshResult = await getFactureWithPaiements(factureId);
        if (refreshResult.success && refreshResult.data) {
          setFacture(refreshResult.data as FactureData);
        }
      } else {
        toast.error(result.error || "Erreur lors de la génération du numéro d'entrée de caisse");
        return;
      }
    }

    const clientName = facture.client?.nom || facture.clientEntreprise?.nom_entreprise || "N/A";
    const clientPhone = facture.client?.telephone || facture.clientEntreprise?.telephone || "N/A";
    const clientEmail = facture.client?.email || facture.clientEntreprise?.email || "N/A";
    const clientLocation = facture.client?.localisation || facture.clientEntreprise?.localisation || "N/A";

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reçu de Paiement - ${facture.id.slice(-7)}</title>
          <style>
            @page { size: A4; margin: 1cm; }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              display: flex flex-col;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #f59e0b;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
            }
              .title {
                text-align: center;
                font-size: 28px;
                font-weight: bold;
                margin: 20px 0;
                padding: 10px;
                border: 2px solid #000;
              } 
            .title2 {
                text-align: center;
                font-size: 18px;
                color: #f59e0b;
                font-weight: bold;
                margin: 10px 0;
                padding: 5px;

              }
            .info-section {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              margin-bottom: 30px;
            }
            .info-box {
              background: #fef3c7;
              padding: 15px;
              border-radius: 8px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .info-label {
              font-size: 12px;
              color: #666;
              margin-bottom: 5px;
            }
            .info-value {
              font-size: 16px;
              font-weight: bold;
            }
            .info-value2 {
              font-size: 16px;
              font-weight: bold;
              text-align: right;
              color: #f59e0b;
            }
            .payment-details {
              background: #fff;
              border: 2px solid #f59e0b;
              padding: 20px;
              margin: 30px 0;
              border-radius: 8px;
            }
            .payment-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #eee;
            }
            .payment-row:last-child {
              border-bottom: none;
            }
            .payment-label {
              font-weight: 600;
            }
            .payment-value {
              font-weight: bold;
              font-size: 18px;
            }
            .signature-section {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              padding-top: 30px;
             
            }
            .signature-box {
              width: 45%;
              text-align: center;
              padding: 10px;
            }
            .signature-label {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 20px;
              color: #333;
            }
            .signature-line {
              border-top: 2px solid #333;
              margin-top: 3px;
              padding-top: 3px;
              font-size: 12px;
              color: #666;
            }
            .footer {
              margin-top: 20px;
              text-align: center;
              font-size: 12px;
              color: #000;
              border-top: 3px solid #f59e0b;
              padding-top: 5px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/logo.png" alt="KPANDJI AUTOMOBILES Logo" style="height: 60px; width: auto;" />
            <div class="logo">KPANDJI AUTOMOBILES</div>
            <div style="font-size: 12px;">Constructeur et Assembleur Automobile</div>
            <div style="text-align: right;">
            </div>
          </div>
          
          <div class="title">REÇU DE PAIEMENT</div>


          <div class="title2">Numéro: ${numeroEntreeCaisse ? `${numeroEntreeCaisse.prefix_numero}-${numeroEntreeCaisse.numero}` : ""}</div>
          
          <div class="info-section">
            <div class="info-box">
              <div class="info-label">Facture N°</div>
              <div class="info-value">${facture.id.slice(-7)}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Date de Paiement</div>
              <div class="info-value">${new Date(paiement.date_paiement).toLocaleDateString('fr-FR')}</div>
            </div>
          </div>
          
          <div class="info-section">
            <div class="info-box">
              <div class="info-label">Client</div>
              <div class="info-value">${clientName}</div>
              <div style="font-size: 12px; margin-top: 5px;">${clientPhone}</div>
              <div style="font-size: 12px;">${clientEmail}</div>
              <div style="font-size: 12px;">${clientLocation}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Paiement N°</div>
              <div class="info-value">${paiement.id.slice(-7)}</div>
              <div style="font-size: 12px; margin-top: 5px;">Enregistré par: ${paiement.user.firstName} ${paiement.user.lastName}</div>
            </div>
          </div>
          
          <div class="payment-details">
            <div class="payment-row">
              <span class="payment-label">Montant Payé:</span>
              <span class="payment-value">${formatNumberWithSpaces(paiement.avance_payee)} FCFA</span>
            </div>
            <div class="payment-row">
              <span class="payment-label">Montant payé en lettre:</span>
              <span class="info-value2">
              ${numberToFrench(Math.floor(paiement.avance_payee || 0))} francs CFA
              </span>
            </div>
            <div class="payment-row">
              <span class="payment-label">Mode de Paiement:</span>
              <span class="payment-value">${
                paiement.mode_paiement === "VIREMENT" ? "Virement bancaire" :
                paiement.mode_paiement === "CHEQUE" ? "Chèque" :
                paiement.mode_paiement === "CASH" ? "Espèces" : "Carte bancaire"
              }</span>
            </div>
            <div class="payment-row">
              <span class="payment-label">Statut:</span>
              <span class="payment-value">${
                paiement.status_paiement === "PAYE" ? "✅ Payé" :
                paiement.status_paiement === "ANNULE" ? "❌ Annulé" : "⏳ En attente"
              }</span>
            </div>
            <div class="payment-row" style="border-top: 2px solid #f59e0b; margin-top: 10px; padding-top: 15px;">
              <span class="payment-label">Reste à Payer:</span>
              <span class="payment-value" style="color: #dc2626;">${formatNumberWithSpaces(paiement.reste_payer)} FCFA</span>
            </div>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
             
              <div class="signature-line text-black">Client</div>
            </div>
            <div class="signature-box">
             
              <div class="signature-line text-black">Direction </div>
            </div>
          </div>
          
          <div class="footer">
            <p>Abidjan, Cocody – Riviéra Palmerais – 06 BP 1255 Abidjan 06</p>
            <p>Tel : 00225 01 01 04 77 03 | Email: info@kpandji.com</p>
            <p>RCCM : CI-ABJ-03-2022-B13-00710 | CC :2213233</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!facture) return;

    const amount = parseAmountInput(formData.avance_payee);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Veuillez saisir un montant valide");
      return;
    }

    if (amount > facture.reste_payer) {
      toast.error(`Le montant ne peut pas dépasser le reste à payer (${formatNumberWithSpaces(facture.reste_payer)} FCFA)`);
      return;
    }

    setSubmitting(true);

    try {
      const result = await createPaiement({
        factureId: facture.id,
        clientId: facture.client?.id,
        clientEntrepriseId: facture.clientEntreprise?.id,
        avance_payee: amount,
        date_paiement: new Date(formData.date_paiement),
        mode_paiement: formData.mode_paiement,
        status_paiement: formData.status_paiement,
      });

      if (result.success) {
        toast.success("Paiement enregistré avec succès");
        // Reset form
        setFormData({
          avance_payee: "",
          date_paiement: new Date().toISOString().split("T")[0],
          mode_paiement: "VIREMENT",
          status_paiement: "EN_ATTENTE",
        });
        // Refresh data
        const refreshResult = await getFactureWithPaiements(factureId);
        if (refreshResult.success && refreshResult.data) {
          setFacture(refreshResult.data as FactureData);
        }
      } else {
        toast.error(result.error || "Erreur lors de l'enregistrement du paiement");
      }
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement du paiement");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!facture) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">Facture non trouvée</p>
          <Button onClick={() => router.push("/comptable/facture")} className="mt-4">
            Retour
          </Button>
        </div>
      </div>
    );
  }

  const clientName = facture.client?.nom || facture.clientEntreprise?.nom_entreprise || "N/A";

  return (
    <div className="flex flex-col w-full bg-gradient-to-br from-amber-50 via-white to-orange-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => router.push(`/comptable/facture`)}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux factures
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Enregistrement de Paiement</h1>
          <p className="text-gray-600 mt-2">Facture #{facture.id.slice(-7)}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Client Info & Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client Information */}
            <Card className="bg-white shadow-lg">
              <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  {facture.client ? (
                    <User className="w-5 h-5" />
                  ) : (
                    <Building className="w-5 h-5" />
                  )}
                  Informations Client
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Nom</Label>
                    <p className="font-semibold text-gray-900">{clientName}</p>
                  </div>
                  {facture.client?.entreprise && (
                    <div>
                      <Label className="text-sm text-gray-500">Entreprise</Label>
                      <p className="font-semibold text-gray-900">{facture.client.entreprise}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm text-gray-500">Téléphone</Label>
                    <p className="font-semibold text-gray-900">
                      {facture.client?.telephone || facture.clientEntreprise?.telephone || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Email</Label>
                    <p className="font-semibold text-gray-900">
                      {facture.client?.email || facture.clientEntreprise?.email || "N/A"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Localisation</Label>
                    <p className="font-semibold text-gray-900">
                      {facture.client?.localisation || facture.clientEntreprise?.localisation || "N/A"}
                    </p>
                  </div>
                  {(facture.client?.commercial || facture.clientEntreprise?.commercial) && (
                    <div>
                      <Label className="text-sm text-gray-500">Commercial</Label>
                      <p className="font-semibold text-gray-900">
                        {facture.client?.commercial || facture.clientEntreprise?.commercial}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Form */}
            <Card className="bg-white shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Nouveau Paiement
                </CardTitle>
                <CardDescription className="text-white/90">
                  Enregistrez un nouveau paiement pour cette facture
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="avance_payee" className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Montant à payer (FCFA)
                      </Label>
                      <div className="relative">
                        <Input
                          id="avance_payee"
                          type="text"
                          value={formData.avance_payee}
                          onChange={handleAmountChange}
                          placeholder="0"
                          required
                          className="border-2 border-gray-300 focus:border-amber-500 pr-16"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                          FCFA
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Reste à payer: {formatNumberWithSpaces(facture.reste_payer)} FCFA
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date_paiement" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Date de paiement
                      </Label>
                      <Input
                        id="date_paiement"
                        type="date"
                        value={formData.date_paiement}
                        onChange={(e) => setFormData({ ...formData, date_paiement: e.target.value })}
                        required
                        className="border-2 border-gray-300 focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mode_paiement">Mode de paiement</Label>
                      <Select
                        value={formData.mode_paiement}
                        onValueChange={(value: "CB" | "CHEQUE" | "VIREMENT" | "CASH") =>
                          setFormData({ ...formData, mode_paiement: value })
                        }
                      >
                        <SelectTrigger className="border-2 border-gray-300 focus:border-amber-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VIREMENT">💳 Virement bancaire</SelectItem>
                          <SelectItem value="CHEQUE">🏦 Chèque</SelectItem>
                          <SelectItem value="CB">💵 Carte bancaire</SelectItem>
                          <SelectItem value="CASH">💰 Espèces</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status_paiement">Statut du paiement</Label>
                      <Select
                        value={formData.status_paiement}
                        onValueChange={(value: "EN_ATTENTE" | "PAYE" | "ANNULE") =>
                          setFormData({ ...formData, status_paiement: value })
                        }
                      >
                        <SelectTrigger className="border-2 border-gray-300 focus:border-amber-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EN_ATTENTE">⏳ En attente</SelectItem>
                          <SelectItem value="PAYE">✅ Payé</SelectItem>
                          <SelectItem value="ANNULE">❌ Annulé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting || facture.reste_payer === 0}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Enregistrement..." : "Enregistrer le Paiement"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Payment History */}
            {facture.paiements.length > 0 && (
              <Card className="bg-white shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Historique des Paiements
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Reste à payer</TableHead>
                          <TableHead>Enregistré par</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {facture.paiements.map((paiement) => (
                          <TableRow key={paiement.id}>
                            <TableCell>
                              {new Date(paiement.date_paiement).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatNumberWithSpaces(paiement.avance_payee)} FCFA
                            </TableCell>
                            <TableCell>
                              {paiement.mode_paiement === "VIREMENT"
                                ? "💳 Virement"
                                : paiement.mode_paiement === "CHEQUE"
                                ? "🏦 Chèque"
                                : paiement.mode_paiement === "CASH"
                                ? "💰 Espèces"
                                : "💵 CB"}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  paiement.status_paiement === "PAYE"
                                    ? "bg-green-100 text-green-800"
                                    : paiement.status_paiement === "ANNULE"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {paiement.status_paiement === "PAYE"
                                  ? "✅ Payé"
                                  : paiement.status_paiement === "ANNULE"
                                  ? "❌ Annulé"
                                  : "⏳ En attente"}
                              </span>
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatNumberWithSpaces(paiement.reste_payer)} FCFA
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {paiement.user.firstName} {paiement.user.lastName}
                            </TableCell>
                            <TableCell>
                              <Button
                                onClick={() => handlePrintPaiement(paiement)}
                                variant="ghost"
                                size="sm"
                                disabled={!!paiement.numeroEntreeCaisse}
                                className={paiement.numeroEntreeCaisse 
                                  ? "opacity-50 cursor-not-allowed" 
                                  : "hover:bg-amber-100"}
                                title={paiement.numeroEntreeCaisse 
                                  ? "Numéro d'entrée de caisse déjà généré" 
                                  : "Imprimer le reçu"}
                              >
                                <Printer className={`w-4 h-4 ${paiement.numeroEntreeCaisse ? "text-gray-400" : "text-amber-600"}`} />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                 
                  Résumé Financier
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <Label className="text-white/80 text-sm">Total TTC</Label>
                  <p className="text-2xl font-bold text-white">
                    {formatNumberWithSpaces(facture.total_ttc)} FCFA
                  </p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <Label className="text-white/80 text-sm">Total Payé</Label>
                  <p className="text-2xl font-bold text-green-200">
                    {formatNumberWithSpaces(facture.totalPaid)} FCFA
                  </p>
                </div>
                <div className="bg-white/20 rounded-lg p-4 border-2 border-white/30">
                  <Label className="text-white/80 text-sm font-semibold">RESTE À PAYER</Label>
                  <p className="text-3xl font-bold text-white mt-2">
                    {formatNumberWithSpaces(facture.reste_payer)} FCFA
                  </p>
                </div>
                {facture.reste_payer === 0 && (
                  <div className="bg-green-500 rounded-lg p-4 text-center">
                    <p className="text-white font-bold">✅ Facture entièrement payée</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

