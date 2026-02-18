"use server";

import { clerkClient } from "@clerk/nextjs/server";
//import { prisma } from "../prisma";
import { UserRole } from "../prisma";
import { prisma } from "../prisma";
//import { UserRole } from "@/generated/prisma";
//import { UserRole } from "@prisma/client";

export async function createEmployee(
  department: string | undefined,
  clerkId: string,
  role: UserRole
) {
  try {
    const user = await (await clerkClient()).users.getUser(clerkId);

    if (!user || !user.firstName || !user.lastName) {
      throw new Error("User not found");
    }

    await (
      await clerkClient()
    ).users.updateUserMetadata(user.id, {
      publicMetadata: {
        onboardingCompleted: true,
        role: role,
      },
    });

    await prisma.user.create({
      data: {
        clerkId: user.id,
        email: user.emailAddresses[0].emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        role: role,
        department: department,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
    };
  }
}

export async function completeUserOnboarding(
  department: string | undefined,
  clerkId: string,
  role: UserRole,
  telephone?: string
) {
  try {
    const user = await (await clerkClient()).users.getUser(clerkId);

    if (!user || !user.firstName || !user.lastName) {
      throw new Error("User not found");
    }

    await (
      await clerkClient()
    ).users.updateUserMetadata(user.id, {
      publicMetadata: {
        onboardingCompleted: true,
        role: role,
      },
    });

    await prisma.user.create({
      data: {
        clerkId: user.id,
        email: user.emailAddresses[0].emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        role: role,
        department: department,
        telephone: telephone,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to complete onboarding",
    };
  }
}
