"use client";

import { useEffect, useState } from "react";
import { getWooCommerceOrders, syncWooCommerceOrders } from "@/lib/actions/woocommerce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, RefreshCw } from "lucide-react";
import type { WooCommerceOrder } from "@prisma/client";

export default function WooCommerceOrdersPage() {
  const [orders, setOrders] = useState<WooCommerceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const list = await getWooCommerceOrders();
    setOrders(list);
    setLoading(false);
  }

  async function handleSync() {
    setSyncing(true);
    setMessage("");
    const res = await syncWooCommerceOrders();
    if (!res.success) {
      setMessage(res.error);
    } else {
      setMessage(`${res.count} Bestellungen synchronisiert.`);
    }
    await load();
    setSyncing(false);
  }

  if (loading) return <p className="p-6">Lade Bestellungen...</p>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          <h1 className="text-2xl font-bold">WooCommerce Bestellungen</h1>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Synchronisiere..." : "Synchronisieren"}
        </Button>
      </div>

      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      {orders.length === 0 ? (
        <p className="text-muted-foreground">Noch keine Bestellungen synchronisiert.</p>
      ) : (
        <div className="grid gap-4">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Bestellung #{o.orderNumber}</CardTitle>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{o.status}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-sm">{o.customerName ?? "—"}</p>
                <p className="text-sm text-muted-foreground">{o.total?.toString()} {o.currency} · {o.dateCreated ? new Date(o.dateCreated).toLocaleDateString("de-DE") : "—"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
