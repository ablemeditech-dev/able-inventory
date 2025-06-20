interface ParsedBarcodeItem {
  upn: string;
  ubd: string;
  lot: string;
  rawData: string;
}

export interface BarcodeParseResult {
  upn: string;
  lot: string;
  ubd: string;
  rawData: string;
  error?: string;
}

/**
 * UBD 날짜 형식 검증 (YYMMDD)
 */
function validateUbd(ubd: string): boolean {
  if (ubd.length !== 6) return false;

  const year = parseInt(ubd.substring(0, 2));
  const month = parseInt(ubd.substring(2, 4));
  const day = parseInt(ubd.substring(4, 6));

  // 기본적인 날짜 유효성 검사
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  return true;
}

/**
 * 단일 GS1-128 바코드 라인을 파싱
 */
function parseSingleBarcode(barcodeText: string): ParsedBarcodeItem {
  const trimmed = barcodeText.trim();

  if (!trimmed) {
    throw new Error("Empty barcode data");
  }

  // AI 01 (UPN) 파싱 - 14자리
  if (!trimmed.startsWith("01")) {
    throw new Error("Barcode must start with AI 01 (UPN)");
  }

  if (trimmed.length < 16) {
    // "01" + 14자리 UPN
    throw new Error("Barcode too short for UPN");
  }

  const upn = trimmed.substring(2, 16); // AI 01 다음 14자리

  // UPN 숫자 검증
  if (!/^\d{14}$/.test(upn)) {
    throw new Error(`Invalid UPN format: ${upn}`);
  }

  let remaining = trimmed.substring(16);

  // AI 17 (UBD) 파싱 - 6자리
  if (!remaining.startsWith("17")) {
    throw new Error("Expected AI 17 (UBD) after UPN");
  }

  if (remaining.length < 8) {
    // "17" + 6자리 UBD
    throw new Error("Barcode too short for UBD");
  }

  const ubd = remaining.substring(2, 8); // AI 17 다음 6자리

  // UBD 형식 검증
  if (!/^\d{6}$/.test(ubd)) {
    throw new Error(`Invalid UBD format: ${ubd}`);
  }

  if (!validateUbd(ubd)) {
    throw new Error(`Invalid UBD date: ${ubd}`);
  }

  remaining = remaining.substring(8);

  // AI 10 (LOT) 파싱 - 가변 길이
  if (!remaining.startsWith("10")) {
    throw new Error("Expected AI 10 (LOT) after UBD");
  }

  const lot = remaining.substring(2); // AI 10 다음 모든 문자

  if (!lot) {
    throw new Error("LOT number cannot be empty");
  }

  return {
    upn,
    ubd,
    lot,
    rawData: trimmed,
  };
}

/**
 * 여러 줄의 GS1-128 바코드 텍스트를 파싱
 */
export function parseGS1Barcodes(
  barcodes: string | string[]
): BarcodeParseResult[] {
  const inputBarcodes = Array.isArray(barcodes) ? barcodes : [barcodes];

  return inputBarcodes.map((barcode) => {
    try {
      return { ...parseSingleBarcode(barcode), rawData: barcode };
    } catch (e: any) {
      return {
        upn: "",
        lot: "",
        ubd: "",
        rawData: barcode,
        error: e.message || "Invalid barcode format",
      };
    }
  });
}

/**
 * 파싱된 데이터를 JSON 형태로 변환
 */
export function parseGS1BarcodesToJson(barcodeText: string): string {
  const result = parseGS1Barcodes(barcodeText);

  if (!result.success) {
    throw new Error(`Parsing failed:\n${result.errors.join("\n")}`);
  }

  return JSON.stringify(result.data, null, 2);
}

/**
 * 파싱된 데이터를 CSV 형태로 변환
 */
export function parseGS1BarcodesToCsv(barcodeText: string): string {
  const result = parseGS1Barcodes(barcodeText);

  if (!result.success) {
    throw new Error(`Parsing failed:\n${result.errors.join("\n")}`);
  }

  const headers = ["UPN", "UBD", "LOT", "Raw Data"];
  const csvLines = [headers.join(",")];

  result.data.forEach((item) => {
    const row = [
      item.upn,
      item.ubd,
      item.lot,
      `"${item.rawData}"`, // 원본 데이터는 따옴표로 감싸기
    ];
    csvLines.push(row.join(","));
  });

  return csvLines.join("\n");
}

/**
 * 테스트용 샘플 데이터
 */
export function getTestBarcodeData(): string {
  return `01069437182285231727062310LD240344
01069437182282571727111110LD240818`;
}
