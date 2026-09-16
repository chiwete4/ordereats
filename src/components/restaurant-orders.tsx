import { acknowledgeOrder, assignRider, cancelRestaurantOrder, markOrderPickedUp, markOrderReady, sendOrderForDelivery } from "@/actions/orders";

type Rider = { userId: string; user: { firstName: string; lastName: string; email: string } };
type OrderRow = {
  id: string; status: string; subtotal: { toString(): string }; createdAt: Date;
  order: { orderNumber: string; total: { toString(): string }; customer: { firstName: string; lastName: string; email: string }; };
  items: { id: string; name: string; quantity: number; unitPrice: { toString(): string } }[];
  delivery: { status: string; riderId: string | null; rider: { firstName: string; lastName: string; email: string } | null } | null;
};

const action = "rounded-lg bg-black px-3 py-2 text-sm font-medium text-white";
const danger = "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700";
const labels: Record<string,string> = { CONFIRMED:"Confirmed", PREPARING:"Preparing", READY_FOR_PICKUP:"Ready for pickup", OUT_FOR_DELIVERY:"Out for delivery", DELIVERED:"Delivered", PICKED_UP:"Picked up", CANCELLED:"Cancelled" };

function OrderCard({ row, restaurantId, riders, history = false }: { row: OrderRow; restaurantId: string; riders: Rider[]; history?: boolean }) {
  return <article className="rounded-lg border p-4"><div className="flex flex-col gap-2 sm:flex-row sm:justify-between"><div><div className="flex items-center gap-2"><h3 className="font-semibold">#{row.order.orderNumber}</h3><span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium">{labels[row.status] ?? row.status}</span></div><p className="mt-1 text-sm text-gray-600">{row.order.customer.firstName} {row.order.customer.lastName} · {row.order.customer.email}</p></div><div className="text-sm sm:text-right"><p className="font-medium">₦{Number(row.subtotal).toLocaleString()}</p><p className="text-xs text-gray-500">Restaurant subtotal · {row.createdAt.toLocaleString()}</p></div></div>
    <div className="mt-4 space-y-1 border-t pt-3">{row.items.map(item => <div key={item.id} className="flex justify-between text-sm"><span>{item.quantity}× {item.name}</span><span>₦{(Number(item.unitPrice)*item.quantity).toLocaleString()}</span></div>)}</div>
    <p className="mt-2 text-xs text-gray-500">Whole order total: ₦{Number(row.order.total).toLocaleString()}</p>
    {row.delivery && <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm"><p><strong>Delivery:</strong> {row.delivery.status.replaceAll("_", " ").toLowerCase()}</p><p><strong>Rider:</strong> {row.delivery.rider ? `${row.delivery.rider.firstName} ${row.delivery.rider.lastName}` : "Not assigned"}</p></div>}
    {!history && <div className="mt-4 flex flex-wrap gap-2">
      {row.status === "CONFIRMED" && <form action={acknowledgeOrder}><Hidden restaurantId={restaurantId} orderId={row.id}/><button className={action}>Acknowledge order</button><p className="mt-1 basis-full text-xs text-gray-500">The customer will be told that you have started preparing their order.</p></form>}
      {row.status === "PREPARING" && <form action={markOrderReady}><Hidden restaurantId={restaurantId} orderId={row.id}/><button className={action}>Mark food ready</button></form>}
      {row.status === "READY_FOR_PICKUP" && <><form action={sendOrderForDelivery}><Hidden restaurantId={restaurantId} orderId={row.id}/><button className={action}>Send out for delivery</button></form><form action={markOrderPickedUp}><Hidden restaurantId={restaurantId} orderId={row.id}/><button className="rounded-lg border px-3 py-2 text-sm font-medium">Customer picked up</button></form></>}
      {row.status === "OUT_FOR_DELIVERY" && <form action={assignRider} className="flex flex-wrap gap-2"><Hidden restaurantId={restaurantId} orderId={row.id}/><select name="riderId" required defaultValue={row.delivery?.riderId ?? ""} className="rounded-lg border px-3 py-2 text-sm"><option value="" disabled>Select active rider</option>{riders.map(r => <option key={r.userId} value={r.userId}>{r.user.firstName} {r.user.lastName}</option>)}</select><button className={action}>{row.delivery?.riderId ? "Change rider" : "Assign rider"}</button>{riders.length === 0 && <p className="basis-full text-xs text-gray-500">No active riders are attached to this restaurant.</p>}</form>}
      {["CONFIRMED","PREPARING","READY_FOR_PICKUP"].includes(row.status) && <form action={cancelRestaurantOrder}><Hidden restaurantId={restaurantId} orderId={row.id}/><button className={danger}>Cancel order</button></form>}
    </div>}
  </article>;
}
function Hidden({ restaurantId, orderId }: { restaurantId:string; orderId:string }) { return <><input type="hidden" name="restaurantId" value={restaurantId}/><input type="hidden" name="restaurantOrderId" value={orderId}/></>; }

export function RestaurantOrders({ restaurantId, activeOrders, historyOrders, riders }: { restaurantId:string; activeOrders:OrderRow[]; historyOrders:OrderRow[]; riders:Rider[] }) {
  return <><section className="rounded-xl border bg-white p-6 shadow-sm"><h2 className="text-2xl font-semibold">Incoming / active orders</h2><p className="mt-1 text-sm text-gray-500">Acknowledge paid orders, prepare food, then decide whether it is collected or sent for delivery.</p><div className="mt-6 space-y-4">{activeOrders.length ? activeOrders.map(row => <OrderCard key={row.id} row={row} restaurantId={restaurantId} riders={riders}/>) : <p className="text-sm text-gray-500">No active orders right now.</p>}</div></section>
  <section className="rounded-xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Order history</h2><p className="mt-1 text-sm text-gray-500">Delivered, picked-up and cancelled orders.</p><div className="mt-5 space-y-3">{historyOrders.length ? historyOrders.map(row => <OrderCard key={row.id} row={row} restaurantId={restaurantId} riders={riders} history/>) : <p className="text-sm text-gray-500">No completed orders yet.</p>}</div></section></>;
}
