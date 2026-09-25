// app/admin/settings/page.tsx — AI Engine & Platform System Settings
"use client";

import { useState } from "react";
import { Settings, Save, Check, Sliders, Shield, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function AdminSettingsPage() {
  const [duplicateThreshold, setDuplicateThreshold] = useState("0.85");
  const [ocsDeltaCap, setOcsDeltaCap] = useState("5.0");
  const [autoApproveEqs, setAutoApproveEqs] = useState("75");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary-600" />
            AI Verification Engine Settings
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Configure global scoring weights, thresholds, anti-gaming caps, and model parameter boundaries.
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2 bg-primary-600 hover:bg-primary-700">
          {saved ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
          {saved ? "Saved" : "Save Settings"}
        </Button>
      </div>

      <div className="space-y-4">
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary-600" />
              Duplicate & Fraud Detection Thresholds
            </CardTitle>
            <CardDescription className="text-xs">
              Tune parameters used by sentence-transformers and rapidfuzz.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-primary">
                  Duplicate Cosine Threshold (all-MiniLM-L6-v2)
                </label>
                <Input
                  value={duplicateThreshold}
                  onChange={(e) => setDuplicateThreshold(e.target.value)}
                  placeholder="0.85"
                />
                <p className="text-[11px] text-text-muted">Flag listings with embedding similarity &ge; 0.85 as duplicates.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-primary">
                  Auto-Approval Minimum EQS
                </label>
                <Input
                  value={autoApproveEqs}
                  onChange={(e) => setAutoApproveEqs(e.target.value)}
                  placeholder="75"
                />
                <p className="text-[11px] text-text-muted">Event Quality Score required for instant auto-approval.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="w-5 h-5 text-success" />
              Anti-Gaming Safeguard Boundaries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-primary">
                  OCS Max Delta Cap (&plusmn; Points)
                </label>
                <Input value={ocsDeltaCap} onChange={(e) => setOcsDeltaCap(e.target.value)} placeholder="5.0" />
                <p className="text-[11px] text-text-muted">Maximum allowed score shift per single evaluation update.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-primary">
                  Inactivity Decay Period
                </label>
                <Input readOnly value="180 Days (5% decay)" />
                <p className="text-[11px] text-text-muted">Score reduction applied automatically to inactive accounts.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
