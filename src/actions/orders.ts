"use server";

import { revalidatePath } from "next/cache";
import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

async function requireManager(restaurantId: string) {
  const user = await getOrCreateCurrentUser();
  if (!user) throw new Error("You must be signed in.");
  const membership = await prisma.restaurantStaff.findUnique({ where: { userId_restaurantId: { userId: user.id, restaurantId } } });
  if (!membership || !["OWNER", "STAFF"].includes(membership.role) || !membership.isActive) throw new Error("You are not allowed to manage this restaurant.");
}

async function getRestaurantOrder(restaurantId: string, restaurantOrderId: string) {
  const order = await prisma.restaurantOrder.findFirst({ where: { id: restaurantOrderId, restaurantId }, include: { delivery: true } });
  if (!order) throw new Error("Order not found.");
  return order;
}

export async function acknowledgeOrder(formData: FormData) {
  const restaurantId = String(formData.get("restaurantId") || "");
  const restaurantOrderId = String(formData.get("restaurantOrderId") || "");
  await requireManager(restaurantId);
  const order = await getRestaurantOrder(restaurantId, restaurantOrderId);
  if (order.status !== "CONFIRMED") throw new Error("Only confirmed orders can be acknowledged.");
  await prisma.restaurantOrder.update({ where: { id: order.id }, data: { status: "PREPARING" } });
  revalidatePath("/restaurant/dashboard");
}

export async function markOrderReady(formData: FormData) {
  const restaurantId = String(formData.get("restaurantId") || "");
  const restaurantOrderId = String(formData.get("restaurantOrderId") || "");
  await requireManager(restaurantId);
  const order = await getRestaurantOrder(restaurantId, restaurantOrderId);
  if (order.status !== "PREPARING") throw new Error("Only preparing orders can be marked ready.");
  await prisma.restaurantOrder.update({ where: { id: order.id }, data: { status: "READY_FOR_PICKUP" } });
  revalidatePath("/restaurant/dashboard");
}

export async function sendOrderForDelivery(formData: FormData) {
  const restaurantId = String(formData.get("restaurantId") || "");
  const restaurantOrderId = String(formData.get("restaurantOrderId") || "");
  await requireManager(restaurantId);
  const order = await getRestaurantOrder(restaurantId, restaurantOrderId);
  if (order.status !== "READY_FOR_PICKUP") throw new Error("The food must be ready before it can go out for delivery.");
  await prisma.$transaction([
    prisma.restaurantOrder.update({ where: { id: order.id }, data: { status: "OUT_FOR_DELIVERY" } }),
    prisma.delivery.upsert({ where: { restaurantOrderId: order.id }, create: { restaurantOrderId: order.id, status: "WAITING_FOR_RIDER" }, update: { status: "WAITING_FOR_RIDER", riderId: null, assignedAt: null } }),
  ]);
  revalidatePath("/restaurant/dashboard");
}

export async function assignReadyOrderToRider(formData: FormData) {
  const restaurantId = String(formData.get("restaurantId") || "");
  const restaurantOrderId = String(formData.get("restaurantOrderId") || "");
  const riderId = String(formData.get("riderId") || "");
  await requireManager(restaurantId);
  const order = await getRestaurantOrder(restaurantId, restaurantOrderId);
  if (order.status !== "READY_FOR_PICKUP") throw new Error("Only a ready order can be sent to a rider.");
  const rider = await prisma.restaurantStaff.findUnique({ where: { userId_restaurantId: { userId: riderId, restaurantId } } });
  if (!rider || rider.role !== "RIDER" || !rider.isActive) throw new Error("Choose an active rider for this restaurant.");
  const activeDelivery = await prisma.delivery.findFirst({ where: { riderId, status: { notIn: ["DELIVERED", "CANCELLED"] } }, select: { id: true } });
  if (activeDelivery) throw new Error("That rider is already delivering an order. Choose an available rider.");
  await prisma.$transaction([
    prisma.restaurantOrder.update({ where: { id: order.id }, data: { status: "OUT_FOR_DELIVERY" } }),
    prisma.delivery.upsert({ where: { restaurantOrderId: order.id }, create: { restaurantOrderId: order.id, riderId, status: "ASSIGNED", assignedAt: new Date() }, update: { riderId, status: "ASSIGNED", assignedAt: new Date() } }),
  ]);
  revalidatePath("/restaurant/dashboard");
  revalidatePath("/rider");
}

export async function assignRider(formData: FormData) {
  const restaurantId = String(formData.get("restaurantId") || "");
  const restaurantOrderId = String(formData.get("restaurantOrderId") || "");
  const riderId = String(formData.get("riderId") || "");
  await requireManager(restaurantId);
  const order = await getRestaurantOrder(restaurantId, restaurantOrderId);
  if (order.status !== "OUT_FOR_DELIVERY") throw new Error("Mark the order out for delivery before assigning a rider.");
  const rider = await prisma.restaurantStaff.findUnique({ where: { userId_restaurantId: { userId: riderId, restaurantId } } });
  if (!rider || rider.role !== "RIDER" || !rider.isActive) throw new Error("Choose an active rider for this restaurant.");
  await prisma.delivery.upsert({ where: { restaurantOrderId: order.id }, create: { restaurantOrderId: order.id, riderId, status: "ASSIGNED", assignedAt: new Date() }, update: { riderId, status: "ASSIGNED", assignedAt: new Date() } });
  revalidatePath("/restaurant/dashboard");
}

export async function markOrderPickedUp(formData: FormData) {
  const restaurantId = String(formData.get("restaurantId") || "");
  const restaurantOrderId = String(formData.get("restaurantOrderId") || "");
  await requireManager(restaurantId);
  const order = await getRestaurantOrder(restaurantId, restaurantOrderId);
  if (order.status !== "READY_FOR_PICKUP") throw new Error("Only a ready order can be marked as customer pickup.");
  await prisma.restaurantOrder.update({ where: { id: order.id }, data: { status: "PICKED_UP" } });
  revalidatePath("/restaurant/dashboard");
}

export async function cancelRestaurantOrder(formData: FormData) {
  const restaurantId = String(formData.get("restaurantId") || "");
  const restaurantOrderId = String(formData.get("restaurantOrderId") || "");
  await requireManager(restaurantId);
  const order = await getRestaurantOrder(restaurantId, restaurantOrderId);
  if (["DELIVERED", "PICKED_UP", "CANCELLED", "OUT_FOR_DELIVERY"].includes(order.status)) throw new Error("This order can no longer be cancelled from the restaurant dashboard.");
  await prisma.$transaction(async tx => {
    await tx.restaurantOrder.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    if (order.delivery) await tx.delivery.update({ where: { restaurantOrderId: order.id }, data: { status: "CANCELLED" } });
  });
  revalidatePath("/restaurant/dashboard");
}
