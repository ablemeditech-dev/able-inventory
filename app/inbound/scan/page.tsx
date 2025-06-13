"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  parseGS1Barcodes,
  getTestBarcodeData,
} from "../../../lib/barcodeParser";
import { supabase } from "../../../lib/supabase";

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
}

interface InboundDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (date: string) => void;
  itemCount: number;
}

function InboundDateModal({
  isOpen,
  onClose,
  onConfirm,
  itemCount,
}: InboundDateModalProps) {
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
        <h3 className="text-lg font-semibold text-primary mb-4">입고일 선택</h3>
        <p className="text-text-secondary mb-4">
          {itemCount}개 제품의 입고일을 선택해주세요.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-primary mb-2">
            입고일
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary"
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
            className="px-4 py-2 bg-primary text-text-primary rounded-lg hover:bg-accent-soft transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ScanInboundPage() {
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
  const inputRef = useRef<HTMLInputElement>(null);

  // 실시간 스캔 모드에서 입력 필드에 자동 포커스
  useEffect(() => {
    if (activeTab === "realtime" && isScanning && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeTab, isScanning]);

  // UPN으로 products 테이블에서 CFN과 client 정보 조회
  const enrichWithProductData = async (parsedItems: any[]) => {
    const upns = parsedItems.map((item) => item.upn);

    try {
      // products 테이블에서 UPN으로 CFN과 client_id 조회
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("upn, cfn, description, client_id")
        .in("upn", upns);

      if (productsError) throw productsError;

      // 고유한 client_id들 추출
      const clientIds = [
        ...new Set(products?.map((p) => p.client_id).filter(Boolean) || []),
      ];

      // clients 테이블에서 client 정보 조회
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, company_name")
        .in("id", clientIds);

      if (clientsError) throw clientsError;

      // UPN을 키로 하는 Map 생성
      const productMap = new Map(products?.map((p) => [p.upn, p]) || []);

      // client_id를 키로 하는 Map 생성
      const clientMap = new Map(clients?.map((c) => [c.id, c]) || []);

      // 파싱된 데이터에 제품 및 클라이언트 정보 추가
      const enrichedData: ParsedData[] = parsedItems.map((item) => {
        const product = productMap.get(item.upn);
        const client = product?.client_id
          ? clientMap.get(product.client_id)
          : null;

        return {
          upn: item.upn,
          cfn: product?.cfn || null,
          productName: product?.description || null,
          clientId: product?.client_id || null,
          clientName: client?.company_name || null,
          ubd: item.ubd,
          lot: item.lot,
          rawData: item.rawData,
          error: product ? undefined : "제품을 찾을 수 없습니다",
        };
      });

      return enrichedData;
    } catch (error) {
      console.error("제품 데이터 조회 실패:", error);
      throw error;
    }
  };

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
    // Enter 키를 누르면 스캔 완료로 처리
    if (e.key === "Enter" && currentInput.trim()) {
      const newItem: ScannedItem = {
        id: Date.now().toString(),
        data: currentInput.trim(),
        timestamp: new Date(),
      };

      setScannedItems((prev) => [...prev, newItem]);
      setCurrentInput("");

      // 다음 스캔을 위해 입력 필드에 다시 포커스
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  };

  const handleRemoveScannedItem = (id: string) => {
    setScannedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearScannedItems = () => {
    setScannedItems([]);
    setCurrentInput("");
    setParsedData([]);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleProcessScannedData = async () => {
    if (scannedItems.length === 0) {
      setError("스캔된 데이터가 없습니다.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const barcodeText = scannedItems.map((item) => item.data).join("\n");
      const result = parseGS1Barcodes(barcodeText);

      if (!result.success) {
        setError(`파싱 실패:\n${result.errors.join("\n")}`);
        return;
      }

      // UPN으로 제품 정보 조회
      const enrichedData = await enrichWithProductData(result.data);
      setParsedData(enrichedData);

      const foundProducts = enrichedData.filter((item) => !item.error).length;
      const totalItems = enrichedData.length;

      if (foundProducts === totalItems) {
        setSuccess(`${totalItems}개 항목이 성공적으로 파싱되었습니다.`);
      } else {
        setSuccess(
          `${totalItems}개 항목 중 ${foundProducts}개 제품을 찾았습니다.`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류";
      setError(`파싱 중 오류 발생: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) {
      setError("스캔 데이터를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setParsedData([]);

    try {
      const result = parseGS1Barcodes(pasteText);

      if (!result.success) {
        setError(`파싱 실패:\n${result.errors.join("\n")}`);
        return;
      }

      // UPN으로 제품 정보 조회
      const enrichedData = await enrichWithProductData(result.data);
      setParsedData(enrichedData);

      const foundProducts = enrichedData.filter((item) => !item.error).length;
      const totalItems = enrichedData.length;

      if (foundProducts === totalItems) {
        setSuccess(`${totalItems}개 항목이 성공적으로 파싱되었습니다.`);
      } else {
        setSuccess(
          `${totalItems}개 항목 중 ${foundProducts}개 제품을 찾았습니다.`
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류";
      setError(`파싱 중 오류 발생: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTestData = () => {
    setPasteText(getTestBarcodeData());
    setError("");
    setSuccess("");
  };

  const handleInboundRegister = () => {
    const validItems = parsedData.filter((item) => !item.error);
    if (validItems.length === 0) {
      setError("입고 등록할 유효한 항목이 없습니다.");
      return;
    }
    setIsDateModalOpen(true);
  };

  const handleDateConfirm = async (inboundDate: string) => {
    const validItems = parsedData.filter((item) => !item.error);

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // ABLE 중앙창고 ID
      const ABLE_WAREHOUSE_ID = "c24e8564-4987-4cfd-bd0b-e9f05a4ab541";

      // 기존 movement_reason 값들 확인
      const { data: existingReasons, error: reasonError } = await supabase
        .from("stock_movements")
        .select("movement_reason")
        .limit(10);

      if (!reasonError && existingReasons) {
        console.log("기존 movement_reason 값들:", [
          ...new Set(existingReasons.map((r) => r.movement_reason)),
        ]);
      }

      // CFN으로 products 테이블에서 실제 product ID 조회
      const cfns = validItems.map((item) => item.cfn).filter(Boolean);
      const { data: products, error: productError } = await supabase
        .from("products")
        .select("id, cfn")
        .in("cfn", cfns);

      if (productError) {
        console.error("제품 ID 조회 에러:", productError);
        throw productError;
      }

      // CFN을 키로 하는 product ID Map 생성
      const cfnToIdMap = new Map(products?.map((p) => [p.cfn, p.id]) || []);

      // 같은 UPN, LOT, UBD를 가진 항목들을 그룹핑하여 수량 합산
      const groupedItems = new Map();

      validItems.forEach((item) => {
        const key = `${item.upn}-${item.lot}-${item.ubd}`;
        if (groupedItems.has(key)) {
          groupedItems.get(key).quantity += 1;
        } else {
          groupedItems.set(key, {
            ...item,
            quantity: 1,
          });
        }
      });

      // stock_movements에 입고 기록 추가
      const stockMovements = Array.from(groupedItems.values()).map((item) => {
        const productId = cfnToIdMap.get(item.cfn);
        if (!productId) {
          throw new Error(
            `CFN ${item.cfn}에 해당하는 제품 ID를 찾을 수 없습니다.`
          );
        }

        return {
          product_id: productId, // 실제 product ID (UUID) 사용
          movement_type: "in",
          movement_reason: "purchase", // 다른 값으로 시도
          from_location_id: item.clientId, // 거래처 ID
          to_location_id: ABLE_WAREHOUSE_ID,
          quantity: item.quantity, // 합산된 수량
          lot_number: item.lot,
          ubd_date: `20${item.ubd.substring(0, 2)}-${item.ubd.substring(
            2,
            4
          )}-${item.ubd.substring(4, 6)}`, // YYMMDD → YYYY-MM-DD
          inbound_date: inboundDate,
        };
      });

      console.log("삽입할 데이터:", stockMovements);

      const { error: insertError } = await supabase
        .from("stock_movements")
        .insert(stockMovements);

      if (insertError) {
        console.error("Supabase 에러 상세:", insertError);
        throw insertError;
      }

      setSuccess(
        `${validItems.length}개 항목이 성공적으로 입고 등록되었습니다.`
      );

      // 데이터 초기화 (선택된 날짜는 유지)
      setParsedData([]);
      setScannedItems([]);
      setPasteText("");

      // 입고 목록 페이지로 이동
      setTimeout(() => {
        router.push("/inbound");
      }, 1500); // 성공 메시지를 잠시 보여준 후 이동
    } catch (error) {
      console.error("입고 등록 에러:", error);
      const errorMessage =
        error instanceof Error ? error.message : "알 수 없는 오류";
      setError(`입고 등록 중 오류 발생: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary">스캔 입고</h1>
          <Link
            href="/inbound"
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
              className={`py-2 px-1 font-medium text-sm ${
                activeTab === "realtime"
                  ? "text-primary border-b-2 border-primary"
                  : "text-text-secondary hover:text-primary"
              }`}
            >
              실시간 스캔
            </button>
            <button
              onClick={() => setActiveTab("paste")}
              className={`py-2 px-1 font-medium text-sm ${
                activeTab === "paste"
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
          <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-red-700 whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* 성공 메시지 */}
        {success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-300 rounded-lg">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* 실시간 스캔 탭 */}
        {activeTab === "realtime" && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-accent-soft">
            <div className="text-center mb-6">
              <div className="w-24 h-24 mx-auto bg-primary rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-12 h-12 text-text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
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
                    className="px-6 py-3 bg-primary text-text-primary rounded-lg hover:bg-accent-soft transition-colors flex items-center space-x-2 mx-auto shadow-md hover:shadow-lg"
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
                        className="w-full px-4 py-3 border-2 border-primary rounded-lg focus:outline-none focus:border-accent-soft font-mono text-lg"
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
                    className="px-6 py-3 bg-primary text-text-primary rounded-lg hover:bg-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto shadow-md hover:shadow-lg"
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
                  className="w-12 h-12 text-text-primary"
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
                  onClick={handleLoadTestData}
                  className="px-3 py-1 text-xs bg-accent-soft text-text-secondary rounded hover:bg-accent-light transition-colors"
                >
                  테스트 데이터 로드
                </button>
              </div>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-accent-soft rounded-lg focus:outline-none focus:border-primary font-mono text-sm"
                style={{ fontSize: "16px" }}
                placeholder="스캔한 바코드 데이터를 여기에 붙여넣으세요"
              />
            </div>

            {/* 버튼 */}
            <div className="flex justify-center">
              <button
                onClick={handlePasteSubmit}
                disabled={loading}
                className="px-6 py-3 bg-primary text-text-primary rounded-lg hover:bg-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
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
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((item, index) => (
                    <tr
                      key={index}
                      className={`hover:bg-accent-light ${
                        item.error ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="border border-accent-soft px-4 py-2 text-sm">
                        {index + 1}
                      </td>
                      <td className="border border-accent-soft px-4 py-2 text-sm font-mono">
                        {item.upn}
                      </td>
                      <td className="border border-accent-soft px-4 py-2 text-sm font-mono font-semibold text-primary">
                        {item.cfn || "-"}
                      </td>
                      <td className="border border-accent-soft px-4 py-2 text-sm">
                        {item.productName || "-"}
                      </td>
                      <td className="border border-accent-soft px-4 py-2 text-sm">
                        {item.clientName || "-"}
                      </td>
                      <td className="border border-accent-soft px-4 py-2 text-sm font-mono">
                        {item.ubd}
                      </td>
                      <td className="border border-accent-soft px-4 py-2 text-sm font-mono">
                        {item.lot}
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
                              확인됨
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 입고 등록 버튼 */}
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
                  onClick={handleInboundRegister}
                  disabled={loading}
                  className="px-8 py-4 bg-primary text-text-primary rounded-lg hover:bg-accent-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto shadow-md hover:shadow-lg"
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
                      d="M7 16l-4-4m0 0l4-4m-4 4h18"
                    />
                  </svg>
                  <span className="font-semibold text-lg">
                    입고 등록 ({parsedData.filter((item) => !item.error).length}
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
                      일부 제품을 찾을 수 없습니다.
                      <br />
                      제품 등록 후 다시 시도해주세요.
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 입고일 선택 모달 */}
        <InboundDateModal
          isOpen={isDateModalOpen}
          onClose={() => setIsDateModalOpen(false)}
          onConfirm={handleDateConfirm}
          itemCount={parsedData.filter((item) => !item.error).length}
        />
      </div>
    </div>
  );
}
