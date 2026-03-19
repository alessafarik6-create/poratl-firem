import {
  doc,
  runTransaction,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";

const COUNTER_DOC_PATH_SEGMENTS = ["settings", "sodContractCounter"] as const;

/**
 * Atomically allocates the next "Smlouva o dílo" number for a company.
 * Format: SOD-YYYY-NNNN (year resets sequence).
 */
export async function allocateNextSodContractNumber(
  firestore: Firestore,
  companyId: string
): Promise<string> {
  const ref = doc(
    firestore,
    "companies",
    companyId,
    ...COUNTER_DOC_PATH_SEGMENTS
  );

  const year = new Date().getFullYear();

  const next = await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(ref);
    let seq = 1;
    if (snap.exists()) {
      const data = snap.data() as { year?: number; seq?: number };
      if (data.year === year && typeof data.seq === "number") {
        seq = data.seq + 1;
      }
    }
    transaction.set(ref, {
      year,
      seq,
      updatedAt: serverTimestamp(),
    });
    return seq;
  });

  return `SOD-${year}-${String(next).padStart(4, "0")}`;
}
