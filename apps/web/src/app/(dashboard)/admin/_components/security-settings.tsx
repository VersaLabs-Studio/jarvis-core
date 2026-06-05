"use client";

import type { SecuritySettings } from "@jarvis/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SecuritySettingsProps {
  security: SecuritySettings;
}

export function SecuritySettingsCard({ security }: SecuritySettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">MFA</p>
            <Badge variant={security.mfaEnabled ? "success" : "warning"} className="mt-1">
              {security.mfaEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Session Timeout</p>
            <p className="text-sm font-medium mt-1">{security.sessionTimeout}m</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Rate Limiting</p>
            <Badge variant={security.rateLimiting.enabled ? "success" : "secondary"} className="mt-1">
              {security.rateLimiting.enabled ? "Active" : "Off"}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Min Password</p>
            <p className="text-sm font-medium mt-1">{security.passwordPolicy.minLength} chars</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">IP Whitelist</p>
            <p className="text-sm font-medium mt-1">
              {security.ipWhitelist.length === 0 ? "None" : `${security.ipWhitelist.length} IPs`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
