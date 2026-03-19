import { NextResponse } from "next/server";

type CompanyAddress = {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  registeredAddressFull: string;
};

type CompanyLookupResult = {
  ico: string;
  companyName: string;
  dic?: string | null;
  legalForm?: string | null;
  address: CompanyAddress;
  establishedAt?: string | null;
};

type ErrorResponse = {
  error: string;
  details?: string;
};

/** Oficiální ARES REST (MFČR) – vyhledání ekonomického subjektu podle IČO */
const ARES_EKON_SUBJEKT_URL =
  "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty";

const ICO_RE = /^\d{8}$/;
const FETCH_TIMEOUT_MS = 12_000;

const PRAVNI_FORMA_POPIS: Record<string, string> = {
  "100": "Právní forma neurčena",
  "101": "Podnikající fyzická osoba zapsaná v obchodním rejstříku",
  "102": "Fyzická osoba podnikající dle živnostenského zákona",
  "105": "Fyzická osoba podnikající dle živnostenského zákona",
  "111": "Veřejná obchodní společnost",
  "112": "Společnost s ručením omezeným",
  "113": "Komanditní společnost",
  "121": "Akciová společnost",
  "131": "Družstvo",
  "141": "Státní podnik",
  "161": "Ústav (veřejná instituce)",
  "421": "Zahraniční fyzická osoba",
  "422": "Zahraniční právnická osoba",
  "501": "Odštěpný závod / organizační složka",
  "521": "Evropská společnost (SE)",
  "531": "Evropské družstvo (SCE)",
  "541": "Evropská hospodářská zájmová skupina (EEIG)",
};

function normalizeIco(input: unknown): string {
  return String(input ?? "").replace(/\s+/g, "");
}

function validateIcoChecksum(ico: string): boolean {
  const digits = ico.split("").map((c) => Number(c));
  if (digits.some((d) => !Number.isFinite(d))) return false;

  const weights = [8, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, idx) => acc + digits[idx] * w, 0);
  const remainder = sum % 11;
  let check: number;
  if (remainder === 0) check = 1;
  else if (remainder === 1) check = 0;
  else check = 11 - remainder;

  return check === digits[7];
}

function formatPsc(psc: number | string | undefined | null): string {
  if (psc === undefined || psc === null) return "";
  const s = String(psc).replace(/\D/g, "");
  if (s.length === 5) return `${s.slice(0, 3)} ${s.slice(3)}`;
  return String(psc);
}

function popisPravniFormy(kod: string | undefined | null): string | null {
  if (!kod) return null;
  const popis = PRAVNI_FORMA_POPIS[kod];
  if (popis) return `${popis} (${kod})`;
  return `Kód právní formy ARES: ${kod}`;
}

type AresSidlo = {
  nazevStatu?: string;
  nazevObce?: string;
  nazevCastiObce?: string;
  nazevUlice?: string;
  cisloDomovni?: number | string;
  cisloOrientacni?: number | string;
  psc?: number | string;
  textovaAdresa?: string;
};

type AresEkonomickySubjekt = {
  ico?: string;
  obchodniJmeno?: string;
  sidlo?: AresSidlo;
  pravniForma?: string;
  dic?: string;
  datumVzniku?: string;
};

type AresChyba = {
  kod?: string;
  popis?: string;
  subKod?: string;
};

function buildStreetAndNumber(s: AresSidlo): string {
  const ulice = (s.nazevUlice ?? "").trim();
  const cast = (s.nazevCastiObce ?? "").trim();
  const dom = s.cisloDomovni != null && s.cisloDomovni !== "" ? String(s.cisloDomovni) : "";
  const orient =
    s.cisloOrientacni != null && s.cisloOrientacni !== ""
      ? `/${String(s.cisloOrientacni)}`
      : "";

  if (ulice) {
    return [ulice, dom ? `${dom}${orient}` : ""].filter(Boolean).join(" ");
  }
  if (cast && dom) return `${cast} ${dom}${orient}`.trim();
  if (cast) return cast;
  const fromText = s.textovaAdresa?.split(",")[0]?.trim();
  return fromText ?? "";
}

function mapAresToResult(raw: AresEkonomickySubjekt): CompanyLookupResult {
  const ico = String(raw.ico ?? "").replace(/\D/g, "");
  const sidlo = raw.sidlo ?? {};
  const street = buildStreetAndNumber(sidlo);
  const city = (sidlo.nazevObce ?? "").trim();
  const postalCode = formatPsc(sidlo.psc);
  const country = (sidlo.nazevStatu ?? "").trim() || "Česká republika";

  const registeredAddressFull =
    (sidlo.textovaAdresa ?? "").trim() ||
    [street, postalCode && city ? `${postalCode} ${city}` : city]
      .filter(Boolean)
      .join(", ");

  return {
    ico,
    companyName: (raw.obchodniJmeno ?? "").trim(),
    dic: raw.dic?.trim() || null,
    legalForm: popisPravniFormy(raw.pravniForma),
    establishedAt: raw.datumVzniku?.trim() || null,
    address: {
      street,
      city,
      postalCode,
      country,
      registeredAddressFull,
    },
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      ico?: unknown;
    };

    const rawIco = normalizeIco(body.ico);
    if (!ICO_RE.test(rawIco)) {
      return NextResponse.json(
        {
          error: "Neplatné IČO. Zadejte přesně 8 číslic.",
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    if (!validateIcoChecksum(rawIco)) {
      return NextResponse.json(
        {
          error: "Neplatné IČO (kontrolní číslo nesedí).",
        } satisfies ErrorResponse,
        { status: 400 }
      );
    }

    const headers = req.headers;
    const ip =
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers.get("cf-connecting-ip") ||
      "unknown";

    const now = Date.now();
    const g = globalThis as typeof globalThis & {
      __companyLookupRateMap?: Map<string, number>;
    };
    if (!g.__companyLookupRateMap) g.__companyLookupRateMap = new Map<string, number>();
    const last = g.__companyLookupRateMap.get(ip) ?? 0;
    if (now - last < 2000) {
      return NextResponse.json(
        { error: "Počkejte prosím a zkuste to znovu." } satisfies ErrorResponse,
        { status: 429 }
      );
    }
    g.__companyLookupRateMap.set(ip, now);

    const url = `${ARES_EKON_SUBJEKT_URL}/${encodeURIComponent(rawIco)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "Rajmondata-company-lookup/1.0 (+https://ares.gov.cz)",
        },
      });
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string };
      if (err?.name === "AbortError") {
        console.error("[company-lookup] ARES timeout", { ico: rawIco });
        return NextResponse.json(
          {
            error: "Vypršel časový limit při dotazu do ARES.",
            details: "Zkuste to prosím znovu za chvíli.",
          } satisfies ErrorResponse,
          { status: 504 }
        );
      }
      console.error("[company-lookup] ARES fetch failed", { ico: rawIco, message: err?.message });
      return NextResponse.json(
        {
          error: "Nepodařilo se kontaktovat ARES.",
          details: err?.message,
        } satisfies ErrorResponse,
        { status: 502 }
      );
    } finally {
      clearTimeout(timeout);
    }

    const rawText = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(rawText);
    } catch {
      console.error("[company-lookup] ARES invalid JSON", {
        ico: rawIco,
        status: res.status,
        snippet: rawText.slice(0, 400),
      });
      return NextResponse.json(
        {
          error: "ARES vrátil nečitelnou odpověď.",
          details: `HTTP ${res.status}`,
        } satisfies ErrorResponse,
        { status: 502 }
      );
    }

    if (res.status === 404) {
      const chyba = json as AresChyba;
      const kod = chyba?.kod ?? "";
      if (kod === "NENALEZENO" || chyba?.subKod === "VYSTUP_SUBJEKT_NENALEZEN") {
        console.log("[company-lookup] ARES not found", { ico: rawIco, popis: chyba?.popis });
        return NextResponse.json({
          success: true,
          ico: rawIco,
          foundCount: 0,
          results: [] satisfies CompanyLookupResult[],
        });
      }
    }

    if (!res.ok) {
      const chyba = json as AresChyba;
      const detail =
        [chyba?.popis, chyba?.kod && `(${chyba.kod})`].filter(Boolean).join(" ") ||
        rawText.slice(0, 300);
      console.error("[company-lookup] ARES error response", {
        ico: rawIco,
        status: res.status,
        detail,
      });
      return NextResponse.json(
        {
          error: "Služba ARES vrátila chybu.",
          details: detail,
        } satisfies ErrorResponse,
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 }
      );
    }

    const subjekt = json as AresEkonomickySubjekt;
    if (!subjekt?.ico || !subjekt?.obchodniJmeno) {
      console.error("[company-lookup] ARES unexpected payload", {
        ico: rawIco,
        keys: subjekt && typeof subjekt === "object" ? Object.keys(subjekt) : [],
      });
      return NextResponse.json(
        {
          error: "Neočekávaná struktura odpovědi z ARES.",
          details: "Chybí IČO nebo obchodní jméno v datech.",
        } satisfies ErrorResponse,
        { status: 502 }
      );
    }

    const mapped = mapAresToResult(subjekt);
    console.log("[company-lookup] OK", {
      ico: rawIco,
      companyName: mapped.companyName,
      pravniForma: mapped.legalForm,
    });

    return NextResponse.json({
      success: true,
      ico: rawIco,
      foundCount: 1,
      results: [mapped],
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("[company-lookup] handler failed", err?.message);
    return NextResponse.json(
      { error: "Chyba na serveru.", details: err?.message } satisfies ErrorResponse,
      { status: 500 }
    );
  }
}
