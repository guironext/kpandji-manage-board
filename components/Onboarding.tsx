"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { completeUserOnboarding } from "@/lib/actions/onboarding";
//import { UserRole } from "@/generated/prisma";
import { UserRole } from "@/lib/generated/prisma";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const employeeSchema = z.object({
  firstName: z.string().min(1, "Prénoms obligatoire").max(55),
  lastName: z.string().min(1, "Nom obligatoire").max(55),
  email: z.string().email("Email invalide").max(100),
  department: z.string().optional(),
  role: z.string().min(1, "Rôle est obligatoire").max(55),
  telephone: z.string().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface OnboardingFormProps {
  userEmail: string;
  firstName: string;
  lastName: string;
}

const OnboardingForm = ({
  userEmail,
  firstName,
  lastName,
}: OnboardingFormProps) => {
  
  const { user, isLoaded } = useUser();
  const [accountType, setAccountType] = useState<"admin" | "employee">("employee");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const employeeForm = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName,
      lastName,
      email: userEmail,
      department: "",
      role: "",
      telephone: "",
    },
  });

  const handleEmployeeSubmit = async (data: EmployeeFormValues) => {
    if (!user) {
      return;
    }

    let canRedirect = false;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await completeUserOnboarding(
        data.department || undefined,
        user.id,
        data.role as UserRole,
        data.telephone || undefined
      );

      console.log(response);

      if (response?.success) {
        console.log("Employee created successfully");
        canRedirect = true;
      }
    } catch (error: unknown) {
      console.error(`Error creating employee: ${error}`);
      setError(
        error instanceof Error ? error.message : "Failed to complete onboarding"
      );
    } finally {
      setIsSubmitting(false);
    }

    if (canRedirect) {
      console.log("Redirecting to employee");
      toast.success("Onboarding completed successfully.");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 via-amber-500 to-yellow-400 flex items-center justify-center">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-8 border border-orange-200/50 shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="text-orange-800 mt-4 text-center">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 via-amber-500 to-yellow-400 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Main container with better contrast */}
        <div className="relative overflow-hidden rounded-3xl bg-white/95 backdrop-blur-xl border border-orange-200/50 shadow-2xl">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-100/30 to-yellow-100/30" />
          
          <div className="relative z-10 p-8">
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="text-center space-y-4">
                <CardTitle className="text-3xl font-bold">
                  <span className="bg-gradient-to-r from-orange-700 to-amber-700 bg-clip-text text-transparent">
                    Bienvenue sur
                  </span>
                  <br />
                  <span className="text-gray-800 text-2xl">
                    KPANDJI MANAGEMENT BOARD
                  </span>
                </CardTitle>
                
                <CardDescription className="text-lg text-gray-600">
                  Complétez ce formulaire pour créer votre compte
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-base font-semibold text-gray-700">Type de compte</Label>
                  <RadioGroup
                    defaultValue="employee"
                    value={accountType}
                    onValueChange={(value) =>
                      setAccountType(value as "admin" | "employee")
                    }
                    className="grid grid-cols-1 gap-4"
                  >
                    <div>
                      <RadioGroupItem
                        value="employee"
                        id="employee"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="employee"
                        className={cn(
                          "flex items-center justify-center rounded-xl border-2 border-orange-200 bg-orange-50 p-4 hover:bg-orange-100 hover:border-orange-300 transition-all duration-200 cursor-pointer",
                          accountType === "employee" &&
                            "bg-orange-100 border-orange-400 text-orange-800 shadow-md"
                        )}
                      >
                        <span className="font-medium">Employé</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <Separator className="bg-orange-200" />

                {accountType === "employee" && (
                  <Form {...employeeForm}>
                    <form
                      onSubmit={employeeForm.handleSubmit(handleEmployeeSubmit)}
                      className="space-y-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={employeeForm.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-medium">Prénoms</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  disabled 
                                  className="bg-gray-50 border-gray-200 text-gray-600" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={employeeForm.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-medium">Nom</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  disabled 
                                  className="bg-gray-50 border-gray-200 text-gray-600" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={employeeForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 font-medium">Email</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                disabled 
                                className="bg-gray-50 border-gray-200 text-gray-600" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={employeeForm.control}
                          name="department"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-medium">Département (optionnel)</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="ex: Ingénierie, Ventes, etc."
                                  className="bg-white border-gray-200 focus:border-orange-400 focus:ring-orange-400"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={employeeForm.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-gray-700 font-medium">Rôle</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-white border-gray-200 focus:border-orange-400 focus:ring-orange-400">
                                    <SelectValue placeholder="Sélectionnez un rôle" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="ADMIN">Admin</SelectItem>
                                  <SelectItem value="MAGASINIER">Magasinier</SelectItem>
                                  <SelectItem value="MANAGER">Manager</SelectItem>
                                  <SelectItem value="SUPERVISEUR">Superviseur</SelectItem>
                                  <SelectItem value="CHEFUSINE">Chef Usine</SelectItem>
                                  <SelectItem value="EMPLOYEE">Employé</SelectItem>
                                  <SelectItem value="CHEFEQUIPE">Chef Équipe</SelectItem>
                                  <SelectItem value="CHEFQUALITE">Chef Qualité</SelectItem>
                                  <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                                  <SelectItem value="RH">RH</SelectItem>
                                  <SelectItem value="SAV">SAV</SelectItem>
                                  <SelectItem value="LOGISTIQUE">Logistique</SelectItem>
                                  <SelectItem value="FINANCE">Finance</SelectItem>
                                  <SelectItem value="DIRECTEUR_GENERAL">Directeur Général</SelectItem>
                                  <SelectItem value="CLIENTELLE">Clientèle</SelectItem>
                                  <SelectItem value="COMPTABLE">Comptable</SelectItem>
                                  <SelectItem value="CONCESSIONAIRE">Concessionnaire</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={employeeForm.control}
                        name="telephone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 font-medium">Téléphone (optionnel)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="ex: +33 6 12 34 56 78"
                                className="bg-white border-gray-200 focus:border-orange-400 focus:ring-orange-400"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {error && (
                        <Alert variant="destructive" className="border-red-200 bg-red-50">
                          <AlertDescription className="text-red-800">{error}</AlertDescription>
                        </Alert>
                      )}
                      
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold py-3 text-lg"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Traitement en cours...
                          </span>
                        ) : (
                          "Enregistrer"
                        )}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingForm;
