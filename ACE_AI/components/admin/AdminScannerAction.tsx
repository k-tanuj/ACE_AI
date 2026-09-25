// components/admin/AdminScannerAction.tsx — Conforming to SRD §3.5 & §3.4
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Bell, Loader2, AlertTriangle, CopyCheck, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function AdminScannerAction() {
  const [scanning, setScanning] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [notifyResult, setNotifyResult] = useState<any>(null);
  const router = useRouter();

  async function handleRunScan() {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/verify/scan", { method: "POST" });
      const data = await res.json();
      setScanResult(data);
      router.refresh();
    } catch {
      alert("Verification scan failed.");
    } finally {
      setScanning(false);
    }
  }

  async function handleTriggerNotifications() {
    setNotifying(true);
    setNotifyResult(null);
    try {
      const res = await fetch("/api/engagement/notify", { method: "POST" });
      const data = await res.json();
      setNotifyResult(data);
    } catch {
      alert("Notification trigger failed.");
    } finally {
      setNotifying(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleRunScan}
          disabled={scanning}
          className="rounded-xl gap-2 bg-primary-600 hover:bg-primary-700"
        >
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          Run AI Quality Scanner
        </Button>

        <Button
          onClick={handleTriggerNotifications}
          disabled={notifying}
          variant="outline"
          className="rounded-xl gap-2"
        >
          {notifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          Dispatch Smart Notifications
        </Button>
      </div>

      {/* Notification result pill */}
      {notifyResult && (
        <div className="p-3 bg-success/10 border border-success/30 rounded-xl text-xs text-success-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span>
            Scanned {notifyResult.scannedUsers} users. Dispatched {notifyResult.notificationsCreatedCount} smart notifications (deadlines & re-engagement).
          </span>
        </div>
      )}

      {/* Scanner Insights Modal/Card */}
      {scanResult?.insights && (
        <div className="p-5 rounded-2xl bg-surface border border-border shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary-600" />
              <h3 className="font-bold text-sm text-text-primary">
                AI Quality Scanner Results ({scanResult.totalScanned} Events Evaluated)
              </h3>
            </div>
            <span className="text-xs px-2.5 py-1 bg-primary-100 text-primary-700 rounded-full font-medium">
              SRD §3.5 Compliant
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-success/10 border border-success/20 rounded-xl text-center">
              <p className="text-xs text-success font-semibold">Auto-Approve</p>
              <p className="text-xl font-bold text-success-900">{scanResult.insights.autoApprove}</p>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
              <p className="text-xs text-amber-700 font-semibold">Manual Review</p>
              <p className="text-xl font-bold text-amber-900">{scanResult.insights.needsManualReview}</p>
            </div>
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-xl text-center">
              <p className="text-xs text-danger font-semibold">Flagged / Reject</p>
              <p className="text-xl font-bold text-danger-900">{scanResult.insights.flaggedForRejection}</p>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
              <p className="text-xs text-purple-700 font-semibold">Duplicates Detected</p>
              <p className="text-xl font-bold text-purple-900">{scanResult.insights.potentialDuplicates}</p>
            </div>
          </div>

          {/* Duplicate & Risk list */}
          {scanResult.results?.some((r: any) => r.riskFlags?.length > 0 || r.duplicateCandidate) && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Flagged Items Requiring Moderator Attention:
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {scanResult.results
                  .filter((r: any) => r.riskFlags?.length > 0 || r.duplicateCandidate)
                  .map((item: any) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-border bg-surface-muted/40 text-xs flex flex-col md:flex-row md:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-text-primary">{item.title}</strong>
                          <span className="text-text-muted">by {item.organizer}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary-100 text-primary-800">
                            Score: {item.qualityScore}%
                          </span>
                        </div>
                        {item.duplicateCandidate && (
                          <p className="text-purple-700 mt-1 font-medium flex items-center gap-1">
                            <CopyCheck className="w-3.5 h-3.5" />
                            Duplicate of ID {item.duplicateCandidate.eventId} ({item.duplicateCandidate.similarity}% similarity match)
                          </p>
                        )}
                        {item.riskFlags?.map((f: string, i: number) => (
                          <p key={i} className="text-danger mt-0.5 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {f}
                          </p>
                        ))}
                      </div>

                      <span
                        className={`px-2 py-1 rounded-lg font-bold text-[11px] self-start md:self-auto ${
                          item.verdict === "AUTO_APPROVE"
                            ? "bg-success/20 text-success-800"
                            : item.verdict === "REJECT"
                            ? "bg-danger/20 text-danger-800"
                            : "bg-amber-500/20 text-amber-800"
                        }`}
                      >
                        {item.verdict}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
