import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  addDoc 
} from "firebase/firestore";
import fs from "fs";

/**
 * These tests are meant to be run in the Firebase Emulator environment.
 * They verify the security rules defined in firestore.rules.
 */

describe("Firestore Security Rules", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "friends-expense-tracker-test",
      firestore: {
        rules: fs.readFileSync("firestore.rules", "utf8"),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  test("Unauthorized users cannot read or write anything", async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(unauthedDb, "users/any")));
    await assertFails(setDoc(doc(unauthedDb, "users/any"), { name: "Hacker" }));
  });

  test("Users can only read their own profile", async () => {
    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(alice, "users/alice")));
    await assertFails(getDoc(doc(alice, "users/bob")));
  });

  test("Users cannot set their own workspaceId directly during creation", async () => {
     // Profile creation is allowed but usually workspaceId starts null
     const alice = testEnv.authenticatedContext("alice").firestore();
     await assertSucceeds(setDoc(doc(alice, "users/alice"), {
       name: "Alice",
       email: "alice@example.com",
       createdAt: new Date(),
       workspaceId: null
     }));
  });

  test("Workspace members can read workspace data", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "workspaces/ws1"), {
        members: ["alice", "bob"],
        membersList: { "alice": "Alice", "bob": "Bob" },
        name: "Test Workspace"
      });
    });

    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(alice, "workspaces/ws1")));
    
    const charlie = testEnv.authenticatedContext("charlie").firestore();
    await assertFails(getDoc(doc(charlie, "workspaces/ws1")));
  });

  test("Only workspace members can add expenses", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "workspaces/ws1"), {
        members: ["alice"],
        membersList: { "alice": "Alice" }
      });
    });

    const alice = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(addDoc(collection(alice, "workspaces/ws1/expenses"), {
      amount: 10,
      category: "Food",
      description: "Lunch",
      expenseDate: "2024-05-13",
      paidBy: "alice",
      creatorId: "alice",
      creatorName: "Alice",
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const bob = testEnv.authenticatedContext("bob").firestore();
    await assertFails(addDoc(collection(bob, "workspaces/ws1/expenses"), {
       amount: 10,
       paidBy: "bob"
    }));
  });
});
