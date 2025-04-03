"use server";

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { parseStringify } from "../utils";

interface SignInProps {
  email: string;
  password: string;
}

interface SignUpParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  dateOfBirth?: string;
  ssn?: string;
}

export const signIn = async ({ email, password }: SignInProps) => {
  try {
    // Step 1: Create session with admin client
    const adminClient = await createAdminClient();
    const session = await adminClient.account.createEmailPasswordSession(email, password);

    // Step 2: Set session cookie
    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    // Step 3: Use session client to get user
    const sessionClient = await createSessionClient();
    const user = await sessionClient.account.get();
    console.log("Sign-in user:", user);
    return parseStringify(user);
  } catch (error) {
    console.error('Sign-in Error:', error);
    throw error;
  }
};

export const signUp = async (userData: SignUpParams) => {
  const { email, password, firstName, lastName } = userData;
  try {
    const adminClient = await createAdminClient();

    const newUserAccount = await adminClient.account.create(
      ID.unique(),
      email,
      password,
      `${firstName} ${lastName}`
    );
    const session = await adminClient.account.createEmailPasswordSession(email, password);

    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });
    return parseStringify(newUserAccount);
  } catch (error) {
    console.error('Sign-up Error', error);
    throw error;
  }
};

export async function getLoggedInUser() {
  try {
    const session = await (await cookies()).get("appwrite-session");
    if (!session || !session.value) {
      return null;
    }
    const sessionClient = await createSessionClient();
    const user = await sessionClient.account.get();
    console.log("Logged-in user fetched:", user);
    return parseStringify(user);
  } catch (error) {
    console.error('Get Logged-in User Error:', error);
    return null;
  }
};

export const logoutAccount = async () => {
  try {
    const sessionClient = await createSessionClient();
    (await cookies()).delete('appwrite-session');
    await sessionClient.account.deleteSession('current');
    return true;
  } catch (error) {
    console.error('Logout Error', error);
    return null;
  }
};