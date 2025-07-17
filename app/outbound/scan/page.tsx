"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  parseGS1Barcodes,
  getTestBarcodeData,
} from "../../../lib/barcodeParser";
import { supabase } from "../../../lib/supabase";
import Alert from "../../components/ui/Alert";

interface ScannedItem {
  id: string;
  data: string;
  timestamp: Date;
}

interface ParsedData {
  upn: string;
  cfn: string | null;
  productName: string | null;
  clientId: string | null;
  clientName: string | null;
  ubd: string;
  lot: string;
  rawData: string;
  error?: string;
  availableStock: number;
}

interface BarcodeItem {
  upn: string;
  lot: string;
  ubd: string;
  rawData: string;
  error?: string;
}

interface OutboundDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string) => void;
  itemCount: number;
}

interface Hospital {
  id: string;
  hospital_name: string;
}

interface HospitalSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (hospitalId: string, hospitalName: string) => void;
  hospitals: Hospital[];
  itemCount: number;
  outboundDate: string;
}

function OutboundDateModal({
  isOpen,
  onClose,
  onConfirm,
  itemCount,
}: OutboundDateModalProps) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const handleConfirm = () => {
    onConfirm(selectedDate);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-90vw">
        <h3 className="text-lg font-semibold text-primary mb-4">출고일 선택</h3>
        <p className="text-text-secondary mb-4">
          {itemCount}개 제품의 출고일을 선택해주세요.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-primary mb-2">
            출고일
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary text-gray-900"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-accent-soft text-text-secondary rounded-lg hover:bg-accent-light transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-accent-soft transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

function HospitalSelectModal({
  isOpen,
  onClose,
  onConfirm,
  hospitals,
  itemCount,
  outboundDate,
}: HospitalSelectModalProps) {
  const [selectedHospitalId, setSelectedHospitalId] = useState("");

  const handleConfirm = () => {
    if (selectedHospitalId) {
      const selectedHospital = hospitals.find(
        (h) => h.id === selectedHospitalId
      );
      onConfirm(selectedHospitalId, selectedHospital?.hospital_name || "");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-primary mb-4">출고 병원 선택</h2>

        <div className="mb-4 p-3 bg-accent-soft/20 rounded-lg">
          <p className="text-sm text-text-secondary">
            출고일:{" "}
            <span className="font-medium text-primary">{outboundDate}</span>
          </p>
          <p className="text-sm text-text-secondary">
            출고 품목:{" "}
            <span className="font-medium text-primary">{itemCount}개</span>
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-primary mb-2">
            병원 선택 *
          </label>
          <select
            value={selectedHospitalId}
            onChange={(e) => setSelectedHospitalId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">병원을 선택하세요</option>
            {hospitals.map((hospital) => (
              <option key={hospital.id} value={hospital.id}>
                {hospital.hospital_name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-text-secondary hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedHospitalId}
            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            출고 등록
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ScanOutboundPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"realtime" | "paste">("realtime");
  const [isScanning, setIsScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [parsedData, setParsedData] = useState<ParsedData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedOutboundDate, setSelectedOutboundDate] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 실시간 스캔 모드에서 입력 필드에 자동 포커스
  useEffect(() => {
    if (activeTab === "realtime" && isScanning && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeTab, isScanning]);

  // 병원 목록 가져오기
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const { data, error } = await supabase
          .from("hospitals")
          .select("id, hospital_name")
          .order("hospital_name");

        if (error) throw error;
        setHospitals(data || []);
      } catch (error) {
        console.error("병원 목록 가져오기 실패:", error);
      }
    };

    fetchHospitals();
  }, []);

  const handleStartScan = () => {
    setIsScanning(true);
    setError("");
    setSuccess("");
    setScannedItems([]);
    setParsedData([]);
    // 입력 필드에 포커스
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const handleStopScan = () => {
    setIsScanning(false);
    setCurrentInput("");
  };

  const handleScanInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && currentInput.trim()) {
      const newItem: ScannedItem = {
        id: Date.now().toString(),
        data: currentInput.trim(),
        timestamp: new Date(),
      };
      setScannedItems((prev) => [newItem, ...prev]);
      setCurrentInput("");
    }
  };

  const handleRemoveScannedItem = (id: string) => {
    setScannedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearScannedItems = () => {
    setScannedItems([]);
    setParsedData([]);
    setError("");
    setSuccess("");
  };

  const enrichWithProductData = async (parsedItems: BarcodeItem[]) => {
    const upns = parsedItems.map((item) => String(item.upn));
    const lots = parsedItems.map((item) => String(item.lot));
    const ubds = parsedItems.map((item) => String(item.ubd));

    try {
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, upn, cfn, description, client_id")
        .in("upn", upns);
      if (productsError) throw productsError;

      const clientIds = [
        ...new Set(products?.map((p) => p.client_id).filter(Boolean) || []),
      ];
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, company_name")
        .in("id", clientIds);
      if (clientsError) throw clientsError;

      const productMap = new Map(products?.map((p) => [p.upn, p]) || []);
      const clientMap = new Map(clients?.map((c) => [c.id, c]) || []);

      // CFN 배열 생성 (UPN 대신 CFN으로 재고 조회)
      const cfns = parsedItems
        .map((item) => {
          const product = productMap.get(String(item.upn));
          return product?.cfn || "";
        })
        .filter(Boolean);

      // 디버깅: 파싱된 데이터 확인
      console.log("파싱된 데이터:", parsedItems);
      console.log("UPNs:", upns);
      console.log("CFNs:", cfns);
      console.log("LOTs:", lots);
      console.log("UBDs:", ubds);

      // ABLE 중앙창고 ID
      const ableLocationId = "c24e8564-4987-4cfd-bd0b-e9f05a4ab541";

      // 해당 CFN들의 product_id 조회
      const cfnProducts = products?.filter((p) => cfns.includes(p.cfn)) || [];
      const productIds = cfnProducts.map((p) => p.id);

      console.log("CFN 제품들:", cfnProducts);
      console.log("제품 IDs:", productIds);

      // 재고 계산
      const stockMap = new Map<string, number>();

      if (productIds.length === 0) {
        console.log("제품 ID를 찾을 수 없음");
        // 빈 맵으로 계속 진행
      } else {
        // 입고/출고 이력에서 ABLE 창고의 현재 재고 계산
        const { data: movements, error: movementsError } = await supabase
          .from("stock_movements")
          .select(
            `
            product_id,
            lot_number,
            ubd_date,
            quantity,
            movement_type,
            from_location_id,
            to_location_id
          `
          )
          .in("product_id", productIds)
          .or(
            `from_location_id.eq.${ableLocationId},to_location_id.eq.${ableLocationId}`
          )
          .order("created_at", { ascending: false });

        if (movementsError) {
          console.error("재고 이력 조회 오류:", movementsError);
          throw movementsError;
        }

        console.log("재고 이력 데이터:", movements);

        // 제품 맵 생성 (ID -> CFN)
        const productIdToCfnMap = new Map(
          cfnProducts.map((p) => [p.id, p.cfn])
        );

        movements?.forEach((movement) => {
          const cfn = productIdToCfnMap.get(movement.product_id);
          if (!cfn) return;

          // UBD를 YYYY-MM-DD에서 YYMMDD 형식으로 변환
          let ubdKey = movement.ubd_date;
          if (ubdKey && ubdKey.includes("-") && ubdKey.length === 10) {
            // 2027-11-11 -> 271111
            const parts = ubdKey.split("-");
            if (parts.length === 3) {
              const year = parts[0].slice(-2); // 2027 -> 27
              const month = parts[1]; // 11
              const day = parts[2]; // 11
              ubdKey = year + month + day; // 271111
            }
          }

          const key = `${cfn}-${movement.lot_number}-${ubdKey}`;

          if (!stockMap.has(key)) {
            stockMap.set(key, 0);
          }

          // ABLE로 들어오는 경우 (+), ABLE에서 나가는 경우 (-)
          if (movement.to_location_id === ableLocationId) {
            stockMap.set(key, stockMap.get(key)! + (movement.quantity || 0));
          } else if (movement.from_location_id === ableLocationId) {
            stockMap.set(key, stockMap.get(key)! - (movement.quantity || 0));
          }
        });

        console.log("계산된 재고 맵:", Array.from(stockMap.entries()));
      }

      const enrichedData: ParsedData[] = parsedItems.map((item) => {
        const upn = String(item.upn ?? "");
        const ubd = String(item.ubd ?? "");
        const lot = String(item.lot ?? "");

        const product = productMap.get(upn);
        const client = product?.client_id
          ? clientMap.get(product.client_id)
          : null;
        // CFN으로 재고 검색 (YYMMDD 형식으로 검색)
        const cfn = product?.cfn || "";
        const stockKey = `${cfn}-${lot}-${ubd}`; // CFN + LOT + UBD (모두 YYMMDD 형식)
        const availableStock: number = stockMap.get(stockKey) || 0;

        // 디버깅: 재고 매칭 확인
        console.log(`재고 키: ${stockKey}, 재고량: ${availableStock}`);
        console.log("재고 맵 전체:", Array.from(stockMap.entries()));

        let error;
        if (!product) {
          error = "제품을 찾을 수 없습니다";
        } else if (availableStock <= 0) {
          error = "재고가 없습니다";
        }

        return {
          upn,
          cfn: product?.cfn || null,
          productName: product?.description || null,
          clientId: product?.client_id || null,
          clientName: client?.company_name || null,
          ubd,
          lot,
          rawData: String(item.rawData ?? ""),
          availableStock,
          error,
        };
      });

      return enrichedData;
    } catch (error) {
      console.error("데이터 처리 실패:", error);
      throw error;
    }
  };

  const handleProcessScannedData = async () => {
    if (scannedItems.length === 0) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const barcodes = scannedItems.map((item) => item.data);
      const parsed = parseGS1Barcodes(barcodes);
      const enriched = await enrichWithProductData(parsed);
      setParsedData(enriched);
    } catch (err: unknown) {
      setError(`데이터 처리 실패: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const barcodes = pasteText
        .trim()
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const parsed = parseGS1Barcodes(barcodes);
      const enriched = await enrichWithProductData(parsed);
      setParsedData(enriched);
      setScannedItems(
        enriched.map((item) => ({
          id: `${item.upn}-${item.lot}`,
          data: item.rawData,
          timestamp: new Date(),
        }))
      );
    } catch (err: unknown) {
      setError(`데이터 처리 실패: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOutboundRegister = () => {
    if (parsedData.some((item) => item.error)) {
      setError("오류가 있는 항목을 수정하거나 제거해주세요.");
      return;
    }
    if (parsedData.length === 0) {
      setError("출고할 제품이 없습니다.");
      return;
    }
    setIsDateModalOpen(true);
  };

  const handleDateConfirm = (outboundDate: string) => {
    setSelectedOutboundDate(outboundDate);
    setIsDateModalOpen(false);
    setIsHospitalModalOpen(true);
  };

  const handleHospitalConfirm = async (
    hospitalId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    hospitalName: string
  ) => {
    setIsHospitalModalOpen(false);
    setLoading(true);
    setError("");
    setSuccess("");

    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, upn")
      .in(
        "upn",
        parsedData.map((p) => p.upn)
      );

    if (productsError) {
      setError(`제품 정보 조회 실패: ${productsError.message}`);
      setLoading(false);
      return;
    }

    const productUonMap = new Map(products.map((p) => [p.upn, p.id]));

    const recordsToInsert = parsedData
      .filter((item) => !item.error)
      .map((item) => {
        // UBD를 YYYY-MM-DD 형식으로 변환 (YYMMDD -> YYYY-MM-DD)
        const formattedUbd =
          item.ubd.length === 6
            ? `20${item.ubd.substring(0, 2)}-${item.ubd.substring(
              2,
              4
            )}-${item.ubd.substring(4, 6)}`
            : item.ubd;

        return {
          product_id: productUonMap.get(item.upn),
          from_location_id: "c24e8564-4987-4cfd-bd0b-e9f05a4ab541", // ABLE 중앙창고
          to_location_id: hospitalId, // 선택된 병원 ID
          quantity: 1, // 스캔당 1개 출고로 가정
          lot_number: item.lot,
          ubd_date: formattedUbd,
          movement_type: "out",
          movement_reason: "sale",
          inbound_date: selectedOutboundDate,
          notes: "스캔출고",
        };
      });

    try {
      const { error } = await supabase
        .from("stock_movements")
        .insert(recordsToInsert);
      if (error) throw error;

      setSuccess(
        `${recordsToInsert.length}개의 제품이 성공적으로 출고 처리되었습니다.`
      );
      setParsedData([]);
      setScannedItems([]);

      setTimeout(() => {
        router.push("/outbound");
      }, 2000);
    } catch (err: unknown) {
      setError(`출고 처리 실패: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary">스캔 출고</h1>
          <Link
            href="/outbound"
            className="px-4 py-2 bg-accent-soft text-text-secondary rounded-lg hover:bg-accent-light transition-colors"
          >
            ← 돌아가기
          </Link>
        </div>

        {/* 탭 메뉴 */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("realtime")}
              className={`py-2 px-1 font-medium text-sm ${activeTab === "realtime"
                  ? "text-primary border-b-2 border-primary"
                  : "text-text-secondary hover:text-primary"
                }`}
            >
              실시간 스캔
            </button>
            <button
              onClick={() => setActiveTab("paste")}
              className={`py-2 px-1 font-medium text-sm ${activeTab === "paste"
                  ? "text-primary border-b-2 border-primary"
                  : "text-text-secondary hover:text-primary"
                }`}
            >
              텍스트 붙여넣기
            </button>
          </nav>
        </div>

        {/* 에러 메시지 */}
          {error && (
            <Alert type="error" message={error} />
          )}

        {/* 성공 메시지 */}
        {success && (
          <Alert type="success" message={success} />
        )}

        {/* 실시간 스캔 탭 */}
        {activeTab === "realtime" && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-accent-soft">
            <div className="text-center mb-6">
              <div className="w-24 h-24 mx-auto bg-primary rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.111 16.404a5.5 5.5 0 0 1 7.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2">
                블루투스 스캐너 연결
              </h3>
              <p className="text-text-secondary">
                블루투스 스캐너로 바코드를 스캔하면 실시간으로 데이터가
                입력됩니다
              </p>
            </div>

            {/* 스캔 상태 및 입력 영역 */}
            <div className="mb-6">
              {!isScanning ? (
                <div className="text-center">
                  <button
                    onClick={handleStartScan}
                    className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-accent-soft transition-colors flex items-center space-x-2 mx-auto shadow-md hover:shadow-lg"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-medium">스캔 시작</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 스캔 입력 필드 */}
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      스캔 대기 중... (스캐너로 바코드를 스캔하세요)
                    </label>
                    <div className="relative">
                      <input
                        ref={inputRef}
                        type="text"
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        onKeyDown={handleScanInput}
                        className="w-full px-4 py-3 border-2 border-primary rounded-lg focus:outline-none focus:border-accent-soft font-mono text-lg text-gray-900"
                        placeholder="스캔된 데이터가 여기에 표시됩니다..."
                        autoComplete="off"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-text-secondary">
                      스캔 완료 후 Enter를 누르거나 다음 바코드를 스캔하세요
                    </p>
                  </div>

                  {/* 스캔 중지 버튼 */}
                  <div className="text-center">
                    <button
                      onClick={handleStopScan}
                      className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-2 mx-auto shadow-md hover:shadow-lg"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 10h6v4H9z"
                        />
                      </svg>
                      <span className="font-medium">스캔 중지</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 스캔된 항목 목록 */}
            {scannedItems.length > 0 && (
              <div className="border-t border-accent-soft pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-primary">
                    스캔된 항목 ({scannedItems.length}개)
                  </h4>
                  <button
                    onClick={handleClearScannedItems}
                    className="px-3 py-1 text-sm bg-accent-soft text-text-secondary rounded hover:bg-accent-light transition-colors"
                  >
                    전체 삭제
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {scannedItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-accent-light rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-accent-soft">
                          #{index + 1}
                        </span>
                        <span className="font-mono text-primary">
                          {item.data}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {item.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveScannedItem(item.id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {/* 처리 버튼 */}
                <div className="mt-4 text-center">
                  <button
                    onClick={handleProcessScannedData}
                    disabled={loading}
                    className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto shadow-md hover:shadow-lg"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="font-medium">
                      {loading
                        ? "처리 중..."
                        : `스캔 데이터 처리 (${scannedItems.length}개)`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 텍스트 붙여넣기 탭 */}
        {activeTab === "paste" && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-accent-soft">
            <div className="text-center mb-6">
              <div className="w-24 h-24 mx-auto bg-primary rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2">
                스캔 데이터 붙여넣기
              </h3>
              <p className="text-text-secondary">
                스캔한 바코드 데이터를 붙여넣어 처리합니다
              </p>
            </div>

            {/* 텍스트 입력 영역 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-primary">
                  스캔 데이터
                </label>
                <button
                  onClick={() => {
                    const testData = getTestBarcodeData();
                    setPasteText(testData);
                  }}
                  className="px-3 py-1 text-xs bg-accent-soft text-text-secondary rounded hover:bg-accent-light transition-colors"
                >
                  테스트 데이터 로드
                </button>
              </div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary font-mono text-sm text-gray-900"
                style={{ fontSize: "16px" }}
                placeholder="스캔한 바코드 데이터를 여기에 붙여넣으세요"
              />
            </div>

            {/* 버튼 */}
            <div className="flex justify-center">
              <button
                onClick={handlePasteSubmit}
                disabled={loading}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium whitespace-nowrap">
                  {loading ? "처리 중..." : "데이터 처리"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* 파싱 결과 표시 */}
        {parsedData.length > 0 && (
          <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border border-accent-soft">
            <h3 className="text-lg font-semibold text-primary mb-4">
              파싱 결과 ({parsedData.length}개)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-accent-light">
                    <th className="border border-accent-soft px-4 py-2 text-left text-sm font-medium text-primary">
                      #
                    </th>
                    <th className="border border-accent-soft px-4 py-2 text-left text-sm font-medium text-primary">
                      UPN
                    </th>
                    <th className="border border-accent-soft px-4 py-2 text-left text-sm font-medium text-primary">
                      CFN
                    </th>
                    <th className="border border-accent-soft px-4 py-2 text-left text-sm font-medium text-primary">
                      제품명
                    </th>
                    <th className="border border-accent-soft px-4 py-2 text-left text-sm font-medium text-primary">
                      거래처
                    </th>
                    <th className="border border-accent-soft px-4 py-2 text-left text-sm font-medium text-primary">
                      UBD
                    </th>
                    <th className="border border-accent-soft px-4 py-2 text-left text-sm font-medium text-primary">
                      LOT
                    </th>
                    <th className="border border-accent-soft px-4 py-2 text-left text-sm font-medium text-primary">
                      재고
                    </th>
                    <th className="border border-accent-soft px-4 py-2 text-left text-sm font-medium text-primary">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((item, index) => (
                    <tr
                      key={index}
                      className={`hover:bg-accent-light ${item.error ? "bg-red-50" : ""
                        }`}
                    >
                      <td className="border border-accent-soft px-4 py-2 text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="border border-accent-soft px-4 py-2 text-sm font-mono text-gray-900">
                        {item.upn}
                      </td>
                      <td className="border border-accent-soft px-4 py-2 text-sm font-mono font-semibold text-primary">
                        {item.cfn || "-"}
                      </td>
                      <td className="border border-accent-soft px-4 py-2 text-sm text-gray-900">
                        {item.productName || "-"}
                      </td>
                      <td className="border border-accent-soft px-4 py-2 text-sm text-gray-900">
                        {item.clientName || "-"}
                      </td>
                      <td className="border border-accent-soft px-4 py-2 text-sm font-mono text-gray-900">
                        {item.ubd}
                      </td>
                      <td className="border border-accent-soft px-4 py-2 text-sm font-mono text-gray-900">
                        {item.lot}
                      </td>
                      <td className="border border-accent-soft px-4 py-2 text-sm font-mono text-gray-900">
                        {item.availableStock}개
                      </td>
                      <td className="border border-accent-soft px-4 py-2 text-sm">
                        {item.error ? (
                          <span className="text-red-600 flex items-center space-x-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            <span className="hidden sm:inline text-xs">
                              {item.error}
                            </span>
                          </span>
                        ) : (
                          <span className="text-green-600 flex items-center space-x-1">
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            <span className="hidden sm:inline text-xs">
                              출고가능
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 출고 등록 버튼 */}
            <div className="mt-4 text-center">
              {parsedData.some((item) => item.error) ? (
                <button
                  onClick={() => {
                    const firstErrorItem = parsedData.find(
                      (item) => item.error
                    );
                    const upnParam = firstErrorItem
                      ? `?upn=${encodeURIComponent(firstErrorItem.upn)}`
                      : "";
                    router.push(`/settings/product/add${upnParam}`);
                  }}
                  className="px-8 py-4 bg-accent-light text-primary rounded-lg hover:bg-accent-soft transition-colors flex items-center space-x-2 mx-auto shadow-md hover:shadow-lg"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  <span className="font-semibold text-lg">
                    제품 등록하러 가기 (
                    {parsedData.filter((item) => item.error).length}개)
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleOutboundRegister}
                  disabled={loading}
                  className="px-8 py-4 bg-primary text-white rounded-lg hover:bg-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto shadow-md hover:shadow-lg"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                  <span className="font-semibold text-lg">
                    출고 등록 ({parsedData.filter((item) => !item.error).length}
                    개)
                  </span>
                </button>
              )}

              {parsedData.some((item) => item.error) && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm flex items-center justify-center space-x-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                    <span>
                      일부 제품을 찾을 수 없거나 재고가 부족합니다.
                      <br />
                      제품 등록 또는 재고 확인 후 다시 시도해주세요.
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 출고일 선택 모달 */}
        <OutboundDateModal
          isOpen={isDateModalOpen}
          onClose={() => setIsDateModalOpen(false)}
          onConfirm={handleDateConfirm}
          itemCount={parsedData.filter((item) => !item.error).length}
        />

        {/* 병원 선택 모달 */}
        <HospitalSelectModal
          isOpen={isHospitalModalOpen}
          onClose={() => {
            setIsHospitalModalOpen(false);
            setSelectedOutboundDate("");
          }}
          onConfirm={handleHospitalConfirm}
          hospitals={hospitals}
          itemCount={parsedData.filter((item) => !item.error).length}
          outboundDate={selectedOutboundDate}
        />
      </div>
    </div>
  );
}
