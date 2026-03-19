import {
  type Firestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";

/** Název kořenové kolekce ve Firestore. */
export const CONTRACT_TEMPLATES_COLLECTION = "contractTemplates";

export type ContractTemplateFirestoreDoc = {
  id: string;
  companyId: string;
  name: string;
  content: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  createdBy?: string | null;
};

/**
 * Načte všechny šablony smluv patřící dané firmě.
 * Bezpečnost: vždy filtrujte podle companyId odpovídajícího přihlášenému tenantovi.
 */
export async function fetchContractTemplates(
  db: Firestore,
  companyId: string
): Promise<ContractTemplateFirestoreDoc[]> {
  const q = query(
    collection(db, CONTRACT_TEMPLATES_COLLECTION),
    where("companyId", "==", companyId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Omit<ContractTemplateFirestoreDoc, "id">;
    return { id: d.id, ...data };
  });
}

export type CreateContractTemplateInput = {
  companyId: string;
  name: string;
  content: string;
  createdBy?: string | null;
};

/**
 * Vytvoří nový dokument šablony. ID přidělí Firestore.
 */
export async function createContractTemplate(
  db: Firestore,
  input: CreateContractTemplateInput
): Promise<string> {
  const ref = await addDoc(collection(db, CONTRACT_TEMPLATES_COLLECTION), {
    companyId: input.companyId,
    name: input.name.trim(),
    content: input.content,
    createdBy: input.createdBy ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export type UpdateContractTemplateInput = {
  name?: string;
  content?: string;
};

/**
 * Aktualizuje název a/nebo obsah šablony.
 */
export async function updateContractTemplate(
  db: Firestore,
  templateId: string,
  patch: UpdateContractTemplateInput
): Promise<void> {
  const payload: {
    updatedAt: ReturnType<typeof serverTimestamp>;
    name?: string;
    content?: string;
  } = {
    updatedAt: serverTimestamp(),
  };
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.content !== undefined) payload.content = patch.content;

  await updateDoc(doc(db, CONTRACT_TEMPLATES_COLLECTION, templateId), payload);
}

/**
 * Smaže šablonu. Volat pouze po ověření, že dokument patří companyId uživatele.
 */
export async function deleteContractTemplate(
  db: Firestore,
  templateId: string
): Promise<void> {
  await deleteDoc(doc(db, CONTRACT_TEMPLATES_COLLECTION, templateId));
}
