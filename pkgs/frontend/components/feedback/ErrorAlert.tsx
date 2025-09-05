"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ErrorAlertProps {
  message: string | null | undefined;
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  if (!message) return null;
  return (
    <Alert className="border-red-200 bg-red-50">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">{message}</AlertDescription>
    </Alert>
  );
}
