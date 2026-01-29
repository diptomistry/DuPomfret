"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, KeyRound } from "lucide-react";
import { useState } from "react";

export function BearerTokenDisplay() {
  const session = useAuthStore((s) => s.session);
  const [copied, setCopied] = useState(false);

  const token = session?.access_token ?? null;

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!token) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <KeyRound className="size-4" />
            Bearer token
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No session — sign in to see your bearer token.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <KeyRound className="size-4" />
          Bearer token
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <pre className="text-xs bg-muted/50 rounded-lg p-3 overflow-x-auto break-all font-mono">
          {token}
        </pre>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copyToken}
          className="gap-2"
        >
          <Copy className="size-4" />
          {copied ? "Copied" : "Copy"}
        </Button>
      </CardContent>
    </Card>
  );
}
