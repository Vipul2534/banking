"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { parseStringify } from "../utils";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_TRANSACTION_COLLECTION_ID: TRANSACTION_COLLECTION_ID,
} = process.env;

export const createTransaction = async (transaction: CreateTransactionProps) => {
  try {
    const { database } = await createAdminClient();

    const newTransaction = await database.createDocument(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      ID.unique(),
      {
        channel: 'online',
        category: transaction.category || 'Transfer',
        ...transaction
      }
    )

    return parseStringify(newTransaction);
  } catch (error) {
    console.log(error);
  }
}

export const getTransactionsByBankId = async ({ bankId }: getTransactionsByBankIdProps) => {
  try {
    const { database } = await createAdminClient();

    const senderTransactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal('senderBankId', bankId)],
    );

    const receiverTransactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal('receiverBankId', bankId)],
    );

    const transactions = {
      total: senderTransactions.total + receiverTransactions.total,
      documents: [
        ...senderTransactions.documents, 
        ...receiverTransactions.documents,
      ]
    }

    console.log(`Fetched Appwrite transactions for bankId ${bankId}:`, transactions);
    console.log(`Appwrite transaction categories for bankId ${bankId}:`, transactions.documents.map(t => t.category));

    return parseStringify(transactions);
  } catch (error) {
    console.log(error);
  }
}

export const updateTransactionsWithEmptyCategory = async (bankId: string) => {
  try {
    const { database } = await createAdminClient();

    // Fetch transactions for the specific bankId
    const senderTransactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal('senderBankId', bankId)]
    );

    const receiverTransactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal('receiverBankId', bankId)]
    );

    const transactions = {
      total: senderTransactions.total + receiverTransactions.total,
      documents: [
        ...senderTransactions.documents,
        ...receiverTransactions.documents,
      ]
    };

    const validCategories = ["Food and Drink", "Travel", "Transfer"];

    // If there are fewer than 10 transactions, create additional dummy transactions
    if (transactions.total < 10) {
      const transactionsToCreate = 10 - transactions.total;
      for (let i = 0; i < transactionsToCreate; i++) {
        const randomCategory = validCategories[Math.floor(Math.random() * validCategories.length)];
        await database.createDocument(
          DATABASE_ID!,
          TRANSACTION_COLLECTION_ID!,
          ID.unique(),
          {
            name: `Dummy Transaction ${i + 1}`,
            amount: (Math.random() * 1000).toFixed(2),
            senderId: "dummy-sender-" + i,
            senderBankId: bankId,
            receiverId: "dummy-receiver-" + i,
            receiverBankId: bankId,
            email: "dummy@example.com",
            channel: "online",
            category: randomCategory,
            $createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
            paymentChannel: "online",
            type: "transfer",
            pending: false,
            accountId: bankId,
            image: "",
          }
        );
      }
    }

    // Fetch transactions again after creating new ones
    const updatedSenderTransactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal('senderBankId', bankId)]
    );

    const updatedReceiverTransactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal('receiverBankId', bankId)]
    );

    const updatedTransactions = {
      total: updatedSenderTransactions.total + updatedReceiverTransactions.total,
      documents: [
        ...updatedSenderTransactions.documents,
        ...updatedReceiverTransactions.documents,
      ]
    };

    // Update categories for any transactions with invalid categories
    let updatedCount = 0;
    for (const transaction of updatedTransactions.documents) {
      const currentCategory = transaction.category;
      if (!currentCategory || !validCategories.includes(currentCategory)) {
        const randomCategory = validCategories[Math.floor(Math.random() * validCategories.length)];
        await database.updateDocument(
          DATABASE_ID!,
          TRANSACTION_COLLECTION_ID!,
          transaction.$id,
          {
            category: randomCategory
          }
        );
        updatedCount++;
      }
    }

    return parseStringify({
      message: `Created ${10 - transactions.total} new transactions and updated ${updatedCount} transactions with random categories for bankId ${bankId}.`
    });
  } catch (error) {
    console.error("Error updating transactions:", error);
    return { error: "Failed to update transactions." };
  }
}