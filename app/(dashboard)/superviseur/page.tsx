"use client";

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  Calendar,
  ShoppingCart,
  FileText,
  TrendingUp,
  Activity,
  DollarSign,
  Phone,
  Mail,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  getCommercialActivitiesStats,
  getRecentCommercialActivities,
  getMonthlyPerformanceTrends,
} from "@/lib/actions/superviseur";
import { Decimal } from "@/lib/generated/prisma/runtime/library";

interface CommercialPerformance {
  id: string;
  name: string;
  email: string;
  telephone: string | null;
  clients: number;
  prospects: number;
  rendezVous: number;
  commandes: number;
  factures: number;
  revenue: number;
  conversionRate: string | number;
}

interface Stats {
  totalCommercials: number;
  totalClients: number;
  totalProspects: number;
  totalRendezVous: number;
  totalCommandes: number;
  totalFactures: number;
  totalRevenue: number;
  commercialPerformance: CommercialPerformance[];
}

interface MonthlyTrend {
  month: string;
  newClients: number;
  revenue: number;
}

interface RecentActivities {
  recentClients: Array<{
    id: string;
    nom: string;
    createdAt: Date;
    status_client: string;
    user: {
      firstName: string;
      lastName: string;
    };
  }>;
  recentRendezVous: Array<{
    id: string;
    date: Date;
    createdAt: Date;
    statut: string;
    client?: {
      nom: string;
      user: {
        firstName: string;
        lastName: string;
      };
    } | null;
    clientEntreprise?: {
      nom_entreprise: string;
      user: {
        firstName: string;
        lastName: string;
      };
    } | null;
  }>;
  recentCommandes: Array<{
    id: string;
    createdAt: Date;
    etapeCommande: string;
    voitureModel?: {
      model: string;
    } | null;
    client?: {
      user: {
        firstName: string;
        lastName: string;
      };
    } | null;
    clientEntreprise?: {
      user: {
        firstName: string;
        lastName: string;
      };
    } | null;
  }>;
  recentFactures: Array<{
    id: string;
    total_ttc: Decimal;
    status_facture: string;
    user: {
      firstName: string;
      lastName: string;
    };
    client?: {
      nom: string;
    } | null;
    clientEntreprise?: {
      nom_entreprise: string;
    } | null;
  }>;
}

const SuperviseurDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivities | null>(null);
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const [statsResult, activitiesResult, trendsResult] = await Promise.all([
        getCommercialActivitiesStats(),
        getRecentCommercialActivities(10),
        getMonthlyPerformanceTrends(),
      ]);

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data as Stats);
      }

      if (activitiesResult.success && activitiesResult.data) {
        setRecentActivities(activitiesResult.data);
      }

      if (trendsResult.success && trendsResult.data) {
        setTrends(trendsResult.data);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          Tableau de Bord Superviseur
        </h1>
        <p className="text-slate-600">
          Supervision des activités commerciales
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-full -translate-y-16 translate-x-16"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Commerciaux
            </CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-slate-900">
              {stats?.totalCommercials || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Équipe commerciale active
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-full -translate-y-16 translate-x-16"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Clients
            </CardTitle>
            <UserCheck className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-slate-900">
              {stats?.totalClients || 0}
            </div>
            <div className="flex items-center mt-2">
              <span className="text-xs text-slate-500">
                {stats?.totalProspects || 0} prospects
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-full -translate-y-16 translate-x-16"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Commandes
            </CardTitle>
            <ShoppingCart className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold text-slate-900">
              {stats?.totalCommandes || 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats?.totalRendezVous || 0} rendez-vous
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/10 to-amber-600/10 rounded-full -translate-y-16 translate-x-16"></div>
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Chiffre d&apos;Affaires Total
            </CardTitle>
            <DollarSign className="h-5 w-5 text-amber-600" />
          </CardHeader>
          <CardContent className="relative">
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats?.totalFactures || 0} factures
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends */}
      {trends.length > 0 && (
        <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Tendances Mensuelles (6 derniers mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {trends.map((trend, index) => (
                <div key={index} className="p-4 bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg">
                  <p className="text-xs font-medium text-slate-600 mb-2">
                    {trend.month}
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-blue-600" />
                      <span className="text-sm font-bold">{trend.newClients}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatCurrency(trend.revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commercial Performance Table */}
      <Card className="mb-8 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Performance par Commercial
          </CardTitle>
          <CardDescription>
            Vue d&apos;ensemble des performances individuelles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 text-sm font-semibold text-slate-700">
                    Commercial
                  </th>
                  <th className="text-center p-3 text-sm font-semibold text-slate-700">
                    Clients
                  </th>
                  <th className="text-center p-3 text-sm font-semibold text-slate-700">
                    Prospects
                  </th>
                  <th className="text-center p-3 text-sm font-semibold text-slate-700">
                    RDV
                  </th>
                  <th className="text-center p-3 text-sm font-semibold text-slate-700">
                    Commandes
                  </th>
                  <th className="text-center p-3 text-sm font-semibold text-slate-700">
                    Factures
                  </th>
                  <th className="text-right p-3 text-sm font-semibold text-slate-700">
                    CA Total
                  </th>
                  <th className="text-center p-3 text-sm font-semibold text-slate-700">
                    Taux Conv.
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats?.commercialPerformance.map((commercial) => (
                  <tr
                    key={commercial.id}
                    className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">
                          {commercial.name}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          {commercial.email && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {commercial.email}
                            </span>
                          )}
                          {commercial.telephone && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {commercial.telephone}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {commercial.clients}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {commercial.prospects}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {commercial.rendezVous}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        {commercial.commandes}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                        {commercial.factures}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-semibold text-slate-900">
                      {formatCurrency(commercial.revenue)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {Number(commercial.conversionRate) > 0 ? (
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-600" />
                        )}
                        <span className={`font-semibold ${
                          Number(commercial.conversionRate) > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {commercial.conversionRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Clients */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="h-5 w-5 text-green-600" />
              Clients Récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities?.recentClients?.slice(0, 5).map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900">{client.nom}</p>
                    <p className="text-xs text-slate-500">
                      Par {client.user.firstName} {client.user.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        client.status_client === "CLIENT" ? "default" : "secondary"
                      }
                      className={
                        client.status_client === "CLIENT"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }
                    >
                      {client.status_client}
                    </Badge>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDate(client.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Rendez-vous */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
              Rendez-vous Récents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities?.recentRendezVous?.slice(0, 5).map((rdv) => (
                <div
                  key={rdv.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {rdv.client?.nom || rdv.clientEntreprise?.nom_entreprise}
                    </p>
                    <p className="text-xs text-slate-500">
                      {rdv.client?.user?.firstName || rdv.clientEntreprise?.user?.firstName}{" "}
                      {rdv.client?.user?.lastName || rdv.clientEntreprise?.user?.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className={
                        rdv.statut === "EFFECTUE"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : rdv.statut === "CONFIRME"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }
                    >
                      {rdv.statut}
                    </Badge>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDate(rdv.date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Commandes */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5 text-amber-600" />
              Commandes Récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities?.recentCommandes?.slice(0, 5).map((commande) => (
                <div
                  key={commande.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {commande.voitureModel?.model || "N/A"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {commande.client?.user?.firstName || commande.clientEntreprise?.user?.firstName}{" "}
                      {commande.client?.user?.lastName || commande.clientEntreprise?.user?.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      {commande.etapeCommande}
                    </Badge>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatDate(commande.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Factures */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-indigo-600" />
              Factures Récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivities?.recentFactures?.slice(0, 5).map((facture) => (
                <div
                  key={facture.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {facture.client?.nom || facture.clientEntreprise?.nom_entreprise}
                    </p>
                    <p className="text-xs text-slate-500">
                      {facture.user.firstName} {facture.user.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(Number(facture.total_ttc))}
                    </p>
                    <Badge
                      variant="outline"
                      className={
                        facture.status_facture === "PAYEE"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }
                    >
                      {facture.status_facture}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperviseurDashboard;