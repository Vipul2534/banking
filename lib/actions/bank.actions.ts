"use server";

import {
  ACHClass,
  CountryCode,
  TransferAuthorizationCreateRequest,
  TransferCreateRequest,
  TransferNetwork,
  TransferType,
} from "plaid";

import { plaidClient } from "../plaid";
import { parseStringify } from "../utils";

import { getTransactionsByBankId } from "./transaction.actions";
import { getBanks, getBank } from "./user.actions";

// Map Plaid categories to your defined categories with fallback using transaction name
const mapPlaidCategoryToAppCategory = (plaidCategory: string, transactionName: string): string => {
  const validCategories = ["Food and Drink", "Travel", "Transfer"];
  
  // First, try mapping based on Plaid category
  if (plaidCategory) {
    const lowerCategory = plaidCategory.toLowerCase();
    
    // Food and Drink
    if (
      lowerCategory.includes("food") ||
      lowerCategory.includes("restaurant") ||
      lowerCategory.includes("drink") ||
      lowerCategory.includes("dining") ||
      lowerCategory.includes("cafe") ||
      lowerCategory.includes("bar") ||
      lowerCategory.includes("groceries") ||
      lowerCategory.includes("bakery") ||
      lowerCategory.includes("fast food")
    ) {
      return "Food and Drink";
    }
    
    // Travel
    if (
      lowerCategory.includes("travel") ||
      lowerCategory.includes("airline") ||
      lowerCategory.includes("hotel") ||
      lowerCategory.includes("car rental") ||
      lowerCategory.includes("taxi") ||
      lowerCategory.includes("ride sharing") ||
      lowerCategory.includes("public transportation") ||
      lowerCategory.includes("gas") ||
      lowerCategory.includes("parking")
    ) {
      return "Travel";
    }
    
    // Transfer
    if (
      lowerCategory.includes("transfer") ||
      lowerCategory.includes("bank") ||
      lowerCategory.includes("payment") ||
      lowerCategory.includes("withdrawal") ||
      lowerCategory.includes("deposit") ||
      lowerCategory.includes("fee")
    ) {
      return "Transfer";
    }
  }

  // If Plaid category is missing or unmapped, use transaction name as a fallback
  if (transactionName) {
    const lowerName = transactionName.toLowerCase();
    
    // Food and Drink
    if (
      lowerName.includes("restaurant") ||
      lowerName.includes("cafe") ||
      lowerName.includes("bar") ||
      lowerName.includes("grocery") ||
      lowerName.includes("bakery") ||
      lowerName.includes("starbucks") ||
      lowerName.includes("mcdonald") ||
      lowerName.includes("pizza") ||
      lowerName.includes("dunkin") ||
      lowerName.includes("kitchen") ||
      lowerName.includes("diner")
    ) {
      return "Food and Drink";
    }
    
    // Travel
    if (
      lowerName.includes("airline") ||
      lowerName.includes("hotel") ||
      lowerName.includes("motel") ||
      lowerName.includes("uber") ||
      lowerName.includes("lyft") ||
      lowerName.includes("rental") ||
      lowerName.includes("gas") ||
      lowerName.includes("parking") ||
      lowerName.includes("taxi") ||
      lowerName.includes("delta") ||
      lowerName.includes("united") ||
      lowerName.includes("marriott") ||
      lowerName.includes("hilton")
    ) {
      return "Travel";
    }
    
    // Transfer
    if (
      lowerName.includes("transfer") ||
      lowerName.includes("bank") ||
      lowerName.includes("payment") ||
      lowerName.includes("withdrawal") ||
      lowerName.includes("deposit") ||
      lowerName.includes("venmo") ||
      lowerName.includes("paypal") ||
      lowerName.includes("zelle") ||
      lowerName.includes("fee")
    ) {
      return "Transfer";
    }
  }

  // Default to "Transfer" if no match is found
  return "Transfer";
};

// Get multiple bank accounts
export const getAccounts = async ({ userId }: getAccountsProps) => {
  try {
    // get banks from db
    const banks = await getBanks({ userId });

    const accounts = await Promise.all(
      banks?.map(async (bank: Bank) => {
        // get each account info from plaid
        const accountsResponse = await plaidClient.accountsGet({
          access_token: bank.accessToken,
        });
        const accountData = accountsResponse.data.accounts[0];

        // get institution info from plaid
        const institution = await getInstitution({
          institutionId: accountsResponse.data.item.institution_id!,
        });

        const account = {
          id: accountData.account_id,
          availableBalance: accountData.balances.available!,
          currentBalance: accountData.balances.current!,
          institutionId: institution.institution_id,
          name: accountData.name,
          officialName: accountData.official_name,
          mask: accountData.mask!,
          type: accountData.type as string,
          subtype: accountData.subtype! as string,
          appwriteItemId: bank.$id,
          shareableId: bank.shareableId,
        };

        return account;
      })
    );

    const totalBanks = accounts.length;
    const totalCurrentBalance = accounts.reduce((total, account) => {
      return total + account.currentBalance;
    }, 0);

    return parseStringify({ data: accounts, totalBanks, totalCurrentBalance });
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};

// Get one bank account
export const getAccount = async ({ appwriteItemId }: getAccountProps) => {
  try {
    // get bank from db
    const bank = await getBank({ documentId: appwriteItemId });

    // get account info from plaid
    const accountsResponse = await plaidClient.accountsGet({
      access_token: bank.accessToken,
    });
    const accountData = accountsResponse.data.accounts[0];

    // get transfer transactions from appwrite
    const transferTransactionsData = await getTransactionsByBankId({
      bankId: bank.$id,
    });

    const transferTransactions = transferTransactionsData.documents.map(
      (transferData: Transaction) => ({
        id: transferData.$id,
        name: transferData.name!,
        amount: transferData.amount!,
        date: transferData.$createdAt,
        paymentChannel: transferData.channel,
        category: transferData.category || "Transfer",
        type: transferData.senderBankId === bank.$id ? "debit" : "credit",
      })
    );

    // get institution info from plaid
    const institution = await getInstitution({
      institutionId: accountsResponse.data.item.institution_id!,
    });

    const transactions = await getTransactions({
      accessToken: bank?.accessToken,
    });

    const account = {
      id: accountData.account_id,
      availableBalance: accountData.balances.available!,
      currentBalance: accountData.balances.current!,
      institutionId: institution.institution_id,
      name: accountData.name,
      officialName: accountData.official_name,
      mask: accountData.mask!,
      type: accountData.type as string,
      subtype: accountData.subtype! as string,
      appwriteItemId: bank.$id,
    };

    // sort transactions by date such that the most recent transaction is first
    const allTransactions = [...transactions, ...transferTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return parseStringify({
      data: account,
      transactions: allTransactions,
    });
  } catch (error) {
    console.error("An error occurred while getting the account:", error);
  }
};

// Get bank info
export const getInstitution = async ({
  institutionId,
}: getInstitutionProps) => {
  try {
    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: ["US"] as CountryCode[],
    });

    const intitution = institutionResponse.data.institution;

    return parseStringify(intitution);
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};

// Get transactions
export const getTransactions = async ({
  accessToken,
}: getTransactionsProps) => {
  let hasMore = true;
  let transactions: any = [];

  try {
    // Iterate through each page of new transaction updates for item
    while (hasMore) {
      const response = await plaidClient.transactionsSync({
        access_token: accessToken,
      });

      const data = response.data;

      transactions = response.data.added.map((transaction) => {
        const rawCategory = transaction.category ? transaction.category[0] : "";
        const mappedCategory = mapPlaidCategoryToAppCategory(rawCategory, transaction.name);

        console.log(`Plaid transaction: ${transaction.transaction_id}, Name: ${transaction.name}, Raw category: ${rawCategory}, Mapped category: ${mappedCategory}`);

        return {
          id: transaction.transaction_id,
          name: transaction.name,
          paymentChannel: transaction.payment_channel,
          type: transaction.payment_channel,
          accountId: transaction.account_id,
          amount: transaction.amount,
          pending: transaction.pending,
          category: mappedCategory,
          date: transaction.date,
          image: transaction.logo_url,
        };
      });

      hasMore = data.has_more;
    }

    console.log("All Plaid transactions:", transactions);
    return parseStringify(transactions);
  } catch (error) {
    console.error("An error occurred while getting the transactions:", error);
    return [];
  }
};