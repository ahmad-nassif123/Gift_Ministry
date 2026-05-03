"use client";

import React from "react";
import { DashboardLayout } from "./dashboard-layout";
import { DashboardViewBody } from "./dashboard-view-body";
import type { Product } from "@/data/products";
import type { OrderRecord } from "@/types/order";

export type DashboardViewReturnProps = {
  extra: React.ReactNode;
  products: Product[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  dashboardTab: "products" | "orders";
  setDashboardTab: (v: "products" | "orders") => void;
  orders: OrderRecord[];
  reportMonth: string;
  setReportMonth: (v: string) => void;
  reportType: "month" | "quarter" | "year";
  setReportType: (v: "month" | "quarter" | "year") => void;
  reportQuarter: string;
  setReportQuarter: (v: string) => void;
  reportYear: string;
  setReportYear: (v: string) => void;
  reportLoading: boolean;
  setReportLoading: (v: boolean) => void;
  orderSearchQuery: string;
  setOrderSearchQuery: (v: string) => void;
  visitCount: number;
  lowStockProducts: Product[];
  LOW_STOCK_THRESHOLD: number;
  ordersForPeriod: OrderRecord[];
  periodLabel: string;
  ordersDisplayed: OrderRecord[];
  last6Months: { month: string; label: string; count: number }[];
  maxOrdersMonth: number;
  byRequester: { name: string; count: number }[];
  maxByRequester: number;
  filteredProducts: Product[];
  handleAddProduct: () => void;
  handleEditProduct: (p: Product) => void;
  handleDeleteProduct: (slug: string) => Promise<void>;
  handleBackup: () => void;
  handleRestore: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDownloadReport: () => Promise<void>;
  refreshOrders: () => void;
  refetchProducts: (quick?: boolean) => Promise<void>;
  handleLogout: () => Promise<void>;
  /** استيراد Excel لتحديث الكميات (نفس أعمدة التصدير) */
  giftsExcelImporting?: boolean;
  handleImportGiftsExcel?: (e: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  [key: string]: unknown;
};

export function DashboardViewReturn(props: DashboardViewReturnProps) {
  return React.createElement(
    DashboardLayout,
    { extra: props.extra },
    React.createElement(DashboardViewBody, props)
  );
}
