import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import Swal from "sweetalert2";

import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, AlertCircle, Copy, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import bhimUpiUrl from "@/assets/bhim-upi-real.jpg";
import upiAppsUrl from "@/assets/upi-apps-real.jpg";
import panmeLogoUrl from "@/assets/phonepe.png";

const PAYEE_NAME_FALLBACK = "Merchant";
const BHIM_UPI_LOGO = bhimUpiUrl;
const UPI_APPS = upiAppsUrl;
const CENTER_LOGO = panmeLogoUrl;

interface Order {
  order_id: string;
  merchant_order_id?: string | null;
  requested_amount: number;
  payable_amount: number;
  status: "pending" | "paid" | "expired" | "manual_review" | "failed";
  created_at: string;
  expiry_at: string;
  paid_at: string | null;
  success_url?: string | null;
  failure_url?: string | null;
  upi_pa?: string | null;
  upi_pn?: string | null;
}

export function PayPageView({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [now, setNow] = useState(Date.now());
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

<<<<<<< HEAD
  const [pollingActive, setPollingActive] = useState(true);
=======
  // 🔒 Polling control - cancel hone pe band ho jayega
  const [pollingActive, setPollingActive] = useState(true);

  // 🔒 Cancelling state - double click prevent
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
  const [cancelling, setCancelling] = useState(false);

  const lastPollRef = useRef(0);
  const processingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayOrderId = order?.merchant_order_id || order?.order_id || "";

  // ============ FETCH ORDER (1s) ============
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchOnce = async () => {
      try {
        const res = await fetch(`/api/public/pay/${encodeURIComponent(orderId)}`);
        if (!res.ok) return;
        const next = (await res.json()) as Order;
        if (!active) return;
        setOrder((prev) => {
          if (prev?.status === "pending" && next.status === "paid") {
            if (!processingTimerRef.current) {
              setProcessing(true);
              processingTimerRef.current = setTimeout(() => {
                processingTimerRef.current = null;
                setProcessing(false);
                setOrder(next);
              }, 1500);
            }
            return prev;
          }
          return next;
        });
      } catch {
        /* ignore transient network errors */
      }
    };

    const loop = async () => {
      await fetchOnce();
      if (!active) return;
      timer = setTimeout(loop, 1000);
    };
    loop();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      if (processingTimerRef.current) clearTimeout(processingTimerRef.current);
    };
  }, [orderId]);

  // ============ BUILD UPI QR ============
  useEffect(() => {
    if (!order) return;
    const pa = (order.upi_pa || "").trim();
    if (!pa) {
      setQrDataUrl("");
      return;
    }
    const pn = order.upi_pn || PAYEE_NAME_FALLBACK;
    const tnValue = order.merchant_order_id || order.order_id;
    const upiUrl = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&am=${order.payable_amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(tnValue)}`;
    QRCode.toDataURL(upiUrl, {
      width: 960,
      margin: 1,
      errorCorrectionLevel: "H",
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [order?.order_id, order?.merchant_order_id, order?.payable_amount, order?.upi_pa]);

  // ============ POLLING (1.5s) - CANCEL ON INACTIVE ============
  useEffect(() => {
<<<<<<< HEAD
=======
    // 🔒 Agar cancel ho chuka hai toh polling chalu na karo
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
    if (!pollingActive) return;
    if (order?.status && order.status !== "pending") return;

    const tick = setInterval(() => {
      setNow(Date.now());
      if (order?.status === "pending" && Date.now() - lastPollRef.current > 1500) {
        lastPollRef.current = Date.now();
        fetch(`/api/public/payments/poll?order_id=${encodeURIComponent(orderId)}`, {
          method: "POST",
        }).catch(() => {});
      }
    }, 1000);

    return () => clearInterval(tick);
  }, [order?.status, orderId, pollingActive]);

  // ============ BLOCK DEVTOOLS ============
  useEffect(() => {
    const blockContext = (e: MouseEvent) => e.preventDefault();
    const blockKeys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(k)) ||
        (e.metaKey && e.altKey && ["i", "j", "c"].includes(k)) ||
        (e.ctrlKey && k === "u") ||
        (e.metaKey && k === "u") ||
        (e.ctrlKey && k === "s") ||
        (e.metaKey && k === "s")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("contextmenu", blockContext);
    document.addEventListener("keydown", blockKeys, true);

    const prevSelect = document.body.style.userSelect;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    const prevBodyHeight = document.body.style.height;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    const prevHtmlHeight = document.documentElement.style.height;

    document.body.style.userSelect = "none";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.body.style.height = "100dvh";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.documentElement.style.height = "100dvh";

    return () => {
      document.removeEventListener("contextmenu", blockContext);
      document.removeEventListener("keydown", blockKeys, true);
      document.body.style.userSelect = prevSelect;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
      document.body.style.height = prevBodyHeight;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll;
      document.documentElement.style.height = prevHtmlHeight;
    };
  }, []);

  // ============ TIMER ============
  const expiryMs = order ? new Date(order.expiry_at).getTime() : 0;
  const remaining = Math.max(0, expiryMs - now);
  const mm = String(Math.floor(remaining / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");

  const [expireProcessing, setExpireProcessing] = useState(false);
  const expireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (order?.status === "pending" && remaining === 0 && !processing && !expireProcessing) {
      setExpireProcessing(true);
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
      expireTimerRef.current = setTimeout(() => setExpireProcessing(false), 3000);
    }
    return () => {};
  }, [order?.status, remaining, processing, expireProcessing]);
  useEffect(
    () => () => {
      if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    },
    []
  );

  const showProcessing = processing || expireProcessing;

  const effectiveStatus = useMemo(() => {
    if (!order) return "pending";
    if (order.status === "pending" && remaining === 0 && !showProcessing) return "expired";
    return order.status;
  }, [order, remaining, showProcessing]);

  // ============ AUTO REDIRECT ============
  const [redirectIn, setRedirectIn] = useState<number | null>(null);
  useEffect(() => {
    if (!order) return;
    if (showProcessing) {
      setRedirectIn(null);
      return;
    }
    let target: string | null = null;
    const redirectId = order.merchant_order_id || order.order_id;
    if (effectiveStatus === "paid" && order.success_url) {
      target = `${order.success_url}${order.success_url.includes("?") ? "&" : "?"}order_id=${encodeURIComponent(redirectId)}&status=paid`;
    } else if ((effectiveStatus === "expired" || effectiveStatus === "failed") && order.failure_url) {
      target = `${order.failure_url}${order.failure_url.includes("?") ? "&" : "?"}order_id=${encodeURIComponent(redirectId)}&status=${effectiveStatus}`;
    }
    if (!target) {
      setRedirectIn(null);
      return;
    }
    setRedirectIn(3);
    const iv = setInterval(() => {
      setRedirectIn((s) => (s !== null && s > 0 ? s - 1 : s));
    }, 1000);
    const t = setTimeout(() => {
      window.location.href = target!;
    }, 3000);
    return () => {
      clearInterval(iv);
      clearTimeout(t);
    };
  }, [effectiveStatus, showProcessing, order?.success_url, order?.failure_url, order?.order_id, order?.merchant_order_id]);

  // ============ CANCEL HANDLER (SECURE) ============
  async function handleCancel() {
<<<<<<< HEAD
    if (cancelling) return;

=======
    // 🔒 Prevent double click
    if (cancelling) return;

    // 🔒 Already paid order cancel nahi ho sakta
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
    if (order?.status === "paid" || order?.paid_at) {
      await Swal.fire({
        title: "Already Paid",
        text: "This order is already paid. Cannot cancel.",
        icon: "info",
        confirmButtonColor: "#0d4a3a",
      });
      return;
    }

<<<<<<< HEAD
=======
    // 🔒 Already expired - already cancelled
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
    if (order?.status !== "pending") {
      await Swal.fire({
        title: "Cannot Cancel",
        text: "This order is no longer pending.",
        icon: "info",
        confirmButtonColor: "#0d4a3a",
      });
      return;
    }

    const confirm = await Swal.fire({
      title: "Cancel this order?",
      text: "Payment link will be closed immediately.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, cancel",
      cancelButtonText: "Keep it",
      reverseButtons: true,
    });
    if (!confirm.isConfirmed) return;

    setCancelling(true);
<<<<<<< HEAD
    setPollingActive(false);

    try {
=======

    // 🔒 Polling band karo — turant
    setPollingActive(false);

    try {
      // 🔒 Server endpoint se cancel karo (secure)
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
      const res = await fetch("/api/public/pay/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId }),
      });

      const result = await res.json().catch(() => ({}));

<<<<<<< HEAD
=======
      // 🔒 Agar server ne mana kiya (already paid ho gaya)
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
      if (!res.ok || !result?.ok) {
        if (result?.error === "order_already_paid") {
          await Swal.fire({
            title: "Order Already Paid",
            text: "This order was already paid. Redirecting...",
            icon: "info",
            timer: 2000,
            showConfirmButton: false,
            confirmButtonColor: "#0d4a3a",
          });
          window.location.href = "/";
          return;
        }
<<<<<<< HEAD
      }

=======
        // Other errors — still redirect to failure URL (order 5 min mein auto-expire hoga)
      }

      // 🔒 Success — merchant ki failure_url pe redirect
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
      const failureUrl = order?.failure_url;
      if (failureUrl) {
        const redirectId = order?.merchant_order_id || order?.order_id || "";
        const sep = failureUrl.includes("?") ? "&" : "?";
        window.location.href = `${failureUrl}${sep}order_id=${encodeURIComponent(redirectId)}&status=cancelled`;
      } else {
        window.location.href = "/";
      }
    } catch {
<<<<<<< HEAD
=======
      // Network error — still redirect (order 5 min mein auto-expire hoga)
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
      const failureUrl = order?.failure_url;
      if (failureUrl) {
        const redirectId = order?.merchant_order_id || order?.order_id || "";
        const sep = failureUrl.includes("?") ? "&" : "?";
        window.location.href = `${failureUrl}${sep}order_id=${encodeURIComponent(redirectId)}&status=cancelled`;
      } else {
        window.location.href = "/";
      }
    }
  }

  // ============ LOADING SKELETON ============
  if (!order) {
    return (
      <main
        className="fixed inset-0 h-[100dvh] w-[100dvw] overflow-hidden overscroll-none flex items-center justify-center p-3 sm:p-4"
<<<<<<< HEAD
        style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%)",
          touchAction: "none",
        }}
      >
        <div className="relative w-full max-w-[340px] sm:max-w-[360px]">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] overflow-hidden">
            <div className="flex flex-col items-center pt-6 pb-3 px-5">
=======
        style={{ background: "#f5f5f5", touchAction: "none" }}
      >
        <div className="relative w-full max-w-[320px] sm:max-w-[340px]">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="flex flex-col items-center pt-5 pb-2.5 px-5">
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>
            <div className="text-center px-5 pb-4">
              <Skeleton className="h-6 w-44 rounded-md mx-auto" />
              <Skeleton className="h-3.5 w-20 rounded-md mx-auto mt-2.5" />
            </div>
<<<<<<< HEAD
            <div className="border-t border-slate-100 grid grid-cols-2 bg-slate-50/50">
              <div className="px-5 py-4 border-r border-slate-100">
                <Skeleton className="h-5 w-24 rounded-md" />
              </div>
              <div className="px-5 py-4 flex items-center justify-center">
=======
            <div className="border-t border-gray-200 grid grid-cols-2">
              <div className="px-5 py-3.5 border-r border-gray-200">
                <Skeleton className="h-5 w-24 rounded-md" />
              </div>
              <div className="px-5 py-3.5 flex items-center justify-center">
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
                <Skeleton className="h-6 w-20 rounded-md" />
              </div>
            </div>
            <div className="border-t border-slate-100 px-5 py-5 flex items-center justify-center">
              <Skeleton className="w-[180px] h-[180px] rounded-xl" />
            </div>
            <div className="px-5 pb-5 flex items-center justify-center">
              <Skeleton className="h-6 w-48 rounded-md" />
            </div>
            <div className="border-t border-slate-100 px-5 py-4 flex items-center justify-between">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-9 w-20 rounded-md" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  const showQrCard = effectiveStatus === "pending";

  return (
    <main
      className="fixed inset-0 h-[100dvh] w-[100dvw] overflow-hidden overscroll-none flex items-center justify-center p-3 sm:p-4"
<<<<<<< HEAD
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #eef2f7 100%)",
        touchAction: "none",
      }}
    >
      {/* Global animations */}
      <style>{`
        @keyframes tick-draw { to { stroke-dashoffset: 0; } }
        @keyframes copy-pop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes scale-in { 0% { transform: scale(0.92); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes fade-up { 0% { transform: translateY(8px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(46,125,58,0.4); } 70% { box-shadow: 0 0 0 12px rgba(46,125,58,0); } 100% { box-shadow: 0 0 0 0 rgba(46,125,58,0); } }
        @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .animate-scale-in { animation: scale-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .animate-fade-up { animation: fade-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .success-ring { animation: pulse-ring 1.8s ease-out infinite; }
      `}</style>

      <div className="relative w-full max-w-[340px] sm:max-w-[360px]">
=======
      style={{ background: "#f5f5f5", touchAction: "none" }}
    >
      <div className="relative w-full max-w-[320px] sm:max-w-[340px]">
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
        {showQrCard && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] overflow-hidden animate-scale-in">
            {/* Brand header */}
            <div className="relative flex flex-col items-center pt-6 pb-3 px-5 bg-gradient-to-b from-slate-50/80 to-white">
              <img
                src={BHIM_UPI_LOGO}
                alt="BHIM UPI"
                className="w-[180px] sm:w-[195px] object-contain opacity-95"
              />
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#0d4a3a] via-[#f5a623] to-[#0d4a3a]" />
            </div>

            {/* Merchant name */}
<<<<<<< HEAD
            <div className="text-center px-5 pb-4">
              <div className="text-[13px] font-semibold tracking-[0.18em] text-slate-400 uppercase">
                Paying to
              </div>
              <div className="text-[19px] sm:text-[21px] font-extrabold text-slate-900 leading-tight mt-1 tracking-tight">
                PRINCE SOFTTECH
                <span className="block text-[13px] sm:text-sm font-semibold tracking-[0.12em] text-[#0d4a3a] mt-0.5">
                  UPI GATEWAY
                </span>
              </div>
            </div>

            {/* Amount */}
            <div className="border-t border-slate-100 grid grid-cols-2 bg-slate-50/60">
              <div className="px-5 py-4 border-r border-slate-100 flex items-center">
                <div className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider">
                  Total Amount
                </div>
              </div>
              <div className="px-5 py-4 flex items-center justify-center">
                <div className="text-[22px] sm:text-[24px] font-extrabold text-slate-900 tabular-nums tracking-tight">
=======
            <div className="text-center px-5 pb-3">
              <div className="text-[20px] sm:text-[22px] font-bold text-[#1a2b4a] leading-tight">
                PRINCE SOFTTECH UPI GATEWAY
              </div>
              <div className="text-sm text-gray-400 mt-1">Transfer to</div>
            </div>

            {/* Amount */}
            <div className="border-t border-gray-200 grid grid-cols-2">
              <div className="px-5 py-3.5 border-r border-gray-200">
                <div className="text-sm font-semibold text-[#1a2b4a]">Total Amount</div>
              </div>
              <div className="px-5 py-3.5 flex items-center justify-center">
                <div className="text-[20px] sm:text-[22px] font-bold text-[#1a2b4a]">
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
                  ₹{order.payable_amount.toFixed(2)}
                </div>
              </div>
            </div>

            {/* QR */}
            <div className="border-t border-slate-100 px-5 py-5 flex items-center justify-center bg-white">
              <div className="relative w-[190px] h-[190px] sm:w-[200px] sm:h-[200px] flex items-center justify-center rounded-xl bg-white p-2 ring-1 ring-slate-100 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.08)]">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="UPI QR"
<<<<<<< HEAD
                    className={`w-full h-full rounded-lg transition-all duration-300 ${
                      showProcessing ? "opacity-40 blur-[3px]" : "opacity-100"
=======
                    className={`w-full h-full transition-all duration-300 ${
                      showProcessing ? "opacity-50 blur-[2px]" : "opacity-100"
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
                    }`}
                  />
                )}
                {qrDataUrl && !showProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
<<<<<<< HEAD
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[10px] bg-white p-[3px] shadow-[0_2px_8px_-2px_rgba(15,23,42,0.15)] ring-1 ring-slate-100">
                      <img
                        src={CENTER_LOGO}
                        alt="Logo"
                        className="w-full h-full object-contain rounded-[7px]"
=======
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[8px] bg-white p-[3px] shadow-sm">
                      <img
                        src={CENTER_LOGO}
                        alt="Logo"
                        className="w-full h-full object-contain rounded-[6px]"
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
                      />
                    </div>
                  </div>
                )}
                {showProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-sm shadow-lg rounded-full px-3.5 py-2 text-[#0d4a3a] font-semibold text-xs ring-1 ring-slate-100">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Capturing payment…</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* UPI apps */}
<<<<<<< HEAD
            <div className="px-5 pb-5 flex flex-col items-center justify-center gap-2">
              <div className="text-[11px] font-medium text-slate-400 tracking-wide uppercase">
                Scan with any UPI app
              </div>
              <img
                src={UPI_APPS}
                alt="Supported UPI apps"
                className="w-[220px] sm:w-[235px] object-contain opacity-90"
              />
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-5 py-4 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#f5a623] animate-pulse" />
                <div className="text-[13px] text-slate-500">
                  Expires in{" "}
                  <span className="font-bold text-slate-900 tabular-nums">
                    {mm}:{ss}
                  </span>
                </div>
=======
            <div className="px-5 pb-4 flex items-center justify-center">
              <img src={UPI_APPS} alt="Supported UPI apps" className="w-[225px] sm:w-[240px] object-contain" />
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-5 py-3.5 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Expire in{" "}
                <span className="font-semibold text-[#1a2b4a] tabular-nums">
                  {mm}:{ss}
                </span>
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
              </div>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
<<<<<<< HEAD
                className="px-4 py-2 rounded-lg bg-rose-50 text-rose-600 text-[13px] font-semibold hover:bg-rose-100 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 ring-1 ring-rose-100 hover:ring-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-300"
=======
                className="px-5 py-1.5 rounded-md bg-pink-100 text-pink-500 text-sm font-medium hover:bg-pink-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cancelling
                  </>
                ) : (
                  "Cancel"
                )}
              </button>
            </div>
          </div>
        )}

        {/* PAID */}
        {effectiveStatus === "paid" && (
<<<<<<< HEAD
          <div className="overflow-hidden rounded-3xl shadow-[0_10px_40px_-12px_rgba(15,23,42,0.25)] animate-scale-in bg-white">
            <div className="relative bg-gradient-to-br from-[#2e7d3a] via-[#276b32] to-[#1f5a28] px-6 pt-9 pb-16 text-center overflow-hidden">
              {/* decorative circles */}
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
              <div className="absolute -bottom-12 -left-10 w-40 h-40 rounded-full bg-white/5" />

              <div className="relative mx-auto w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl success-ring">
=======
          <div className="overflow-hidden rounded-3xl shadow-[0_8px_30px_-10px_rgba(0,0,0,0.18)] animate-scale-in">
            <div className="bg-[#2e7d3a] px-6 pt-8 pb-16 text-center relative">
              <div className="mx-auto w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg animate-scale-in">
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
                <svg
                  viewBox="0 0 24 24"
                  className="w-10 h-10"
                  fill="none"
                  stroke="#2e7d3a"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path
                    d="M4 12.5l5 5L20 6.5"
                    style={{
                      strokeDasharray: 40,
                      strokeDashoffset: 40,
                      animation: "tick-draw 0.6s ease-out 0.2s forwards",
                    }}
                  />
                </svg>
              </div>
<<<<<<< HEAD
              <h2 className="relative mt-5 text-white text-xl md:text-2xl font-bold tracking-tight">
                Payment successful!
              </h2>
              <p className="relative mt-2 text-white/85 text-[13px]">
                Redirecting back to merchant's website…
              </p>
            </div>

            <div className="bg-white -mt-10 mx-4 rounded-2xl shadow-[0_6px_24px_-8px_rgba(15,23,42,0.15)] p-4 relative z-10 ring-1 ring-slate-100 animate-fade-up">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f5a623] to-[#e0941a] flex items-center justify-center flex-shrink-0 shadow-sm">
=======
              <h2 className="mt-4 text-white text-xl md:text-2xl font-bold tracking-tight">
                Payment successful!
              </h2>
              <p className="mt-1.5 text-white/90 text-sm">
                Redirecting back to merchant's website...
              </p>
              <style>{`@keyframes tick-draw { to { stroke-dashoffset: 0; } } @keyframes copy-pop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }`}</style>
            </div>

            <div className="bg-white -mt-10 mx-4 rounded-2xl shadow-[0_4px_20px_-6px_rgba(0,0,0,0.12)] p-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#f5a623] flex items-center justify-center flex-shrink-0">
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
                  <svg
                    viewBox="0 0 24 24"
                    className="w-7 h-7"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
<<<<<<< HEAD
                  <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                    Merchant Order
                  </div>
                  <div className="text-[14px] font-bold text-slate-800 truncate mt-0.5">
                    {displayOrderId}
                  </div>
                  <div className="text-[20px] font-extrabold text-slate-900 mt-0.5 tabular-nums">
=======
                  <div className="text-base font-bold text-neutral-800 truncate">
                    {displayOrderId}
                  </div>
                  <div className="text-xl font-bold text-neutral-900 mt-1">
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
                    ₹{order.payable_amount.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

<<<<<<< HEAD
            <div className="bg-white px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <div className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                  Order ID
                </div>
                <div className="text-[13px] text-slate-700 mt-1 font-mono truncate">
=======
            <div className="bg-white px-6 py-4 border-t border-neutral-100 flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <div className="text-sm font-semibold text-neutral-800">Order ID</div>
                <div className="text-xs text-neutral-500 mt-0.5 font-mono truncate">
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
                  {displayOrderId}
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(displayOrderId);
                  } catch {
                    const ta = document.createElement("textarea");
                    ta.value = displayOrderId;
                    document.body.appendChild(ta);
                    ta.select();
                    try {
                      document.execCommand("copy");
                    } catch {}
                    document.body.removeChild(ta);
                  }
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
<<<<<<< HEAD
                className={`p-2.5 rounded-xl transition-all active:scale-95 ${
                  copied
                    ? "text-[#2e7d3a] bg-[#e7f4ea] ring-1 ring-[#c8e6cf]"
                    : "text-[#6b3fa0] hover:bg-slate-50 ring-1 ring-slate-100 hover:ring-slate-200"
=======
                className={`p-2 rounded-lg transition-colors ${
                  copied
                    ? "text-[#2e7d3a] bg-[#e7f4ea]"
                    : "text-[#6b3fa0] hover:bg-neutral-50"
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
                }`}
                aria-label="Copy order ID"
              >
                {copied ? (
                  <Check className="w-5 h-5" style={{ animation: "copy-pop 0.35s ease-out" }} />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>

            {redirectIn !== null && order.success_url && (
<<<<<<< HEAD
              <div className="bg-white px-6 pb-5 text-center text-xs text-slate-500">
                Redirecting in{" "}
                <span className="font-bold text-[#2e7d3a] tabular-nums">{redirectIn}</span>s…
=======
              <div className="bg-white px-6 pb-5 text-center text-xs text-neutral-500">
                Redirecting in{" "}
                <span className="font-semibold text-[#2e7d3a] tabular-nums">{redirectIn}</span>s…
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
              </div>
            )}
          </div>
        )}

        {/* EXPIRED */}
        {effectiveStatus === "expired" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] p-7 text-center animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 flex items-center justify-center ring-1 ring-amber-100">
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-slate-900">Payment Link Expired</div>
            <p className="mt-2 text-[13px] text-slate-500 leading-relaxed">
              This payment link is no longer valid. Please request a new link from the merchant.
            </p>
            {redirectIn !== null && order.failure_url ? (
<<<<<<< HEAD
              <div className="mt-5 text-sm text-slate-600">
                Redirecting in{" "}
                <span className="font-bold text-[#0d4a3a] tabular-nums">{redirectIn}</span>s…
=======
              <div className="mt-5 text-sm text-neutral-600">
                Redirecting in{" "}
                <span className="font-semibold text-primary tabular-nums">{redirectIn}</span>s…
>>>>>>> 5a6b89aa528289c1c0a002c197d1c6ede05251d0
              </div>
            ) : (
              <Button asChild variant="outline" className="mt-6 w-full">
                <a href="/">New Payment</a>
              </Button>
            )}
          </div>
        )}

        {/* MANUAL REVIEW */}
        {effectiveStatus === "manual_review" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_-8px_rgba(15,23,42,0.12)] p-7 text-center animate-scale-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-yellow-50 flex items-center justify-center ring-1 ring-yellow-100">
              <XCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="text-xl font-bold text-slate-900">Under Manual Review</div>
            <p className="mt-2 text-[13px] text-slate-500 leading-relaxed">
              Multiple orders shared this amount. Our team will verify your payment shortly.
            </p>
            <Button asChild className="mt-6 w-full">
              <a href="/">New Payment</a>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}