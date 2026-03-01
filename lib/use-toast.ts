"use client";

import { useState, useCallback, useEffect } from "react";

export type ToastVariant = "default" | "success" | "destructive";

export interface ToastData {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

let listeners: Array<(toast: ToastData) => void> = [];
let toastCount = 0;

function dispatch(toast: ToastData) {
  listeners.forEach((listener) => listener(toast));
}

export function toast({
  title,
  description,
  variant = "default",
}: {
  title: string;
  description?: string;
  variant?: ToastVariant;
}) {
  const id = String(toastCount++);
  dispatch({ id, title, description, variant });
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((t: ToastData) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== t.id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Register/unregister listener
  useEffect(() => {
    listeners.push(addToast);
    return () => {
      listeners = listeners.filter((l) => l !== addToast);
    };
  }, [addToast]);

  return { toasts, removeToast };
}
