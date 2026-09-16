import { redirect } from "next/navigation";

import {
  createMenuCategory,
  createMenuItem,
  toggleMenuItemAvailability,
} from "@/actions/menu";
import { getOrCreateCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

export default async function RestaurantDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ restaurantId?: string }>;
}) {
  const user = await getOrCreateCurrentUser();

  if (!user) {
    redirect("/");
  }

  const { restaurantId } = await searchParams;

  if (!restaurantId) {
    redirect("/restaurant/new");
  }

  const membership = await prisma.restaurantStaff.findUnique({
    where: {
      userId_restaurantId: {
        userId: user.id,
        restaurantId,
      },
    },
    include: {
      restaurant: {
        include: {
          menuCategories: {
            orderBy: { createdAt: "asc" },
            include: {
              menuItems: {
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      },
    },
  });

  if (!membership || membership.role !== "STAFF" || !membership.isActive) {
    redirect("/");
  }

  const restaurant = membership.restaurant;

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <p className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Restaurant dashboard
          </p>
          <h1 className="mt-1 text-3xl font-bold">{restaurant.name}</h1>
          <div className="mt-3 flex gap-4 text-sm text-gray-600">
            <span>Verification: {restaurant.isVerified ? "Verified" : "Pending"}</span>
            <span>Status: {restaurant.isOpen ? "Open" : "Closed"}</span>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <form action={createMenuCategory} className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Add category</h2>
            <p className="mt-1 text-sm text-gray-500">Examples: Meals, Drinks, Snacks.</p>
            <input type="hidden" name="restaurantId" value={restaurant.id} />
            <label htmlFor="category-name" className="mt-5 block text-sm font-medium">
              Category name
            </label>
            <input
              id="category-name"
              name="name"
              required
              placeholder="Meals"
              className="mt-2 w-full rounded-lg border px-3 py-2"
            />
            <button className="mt-4 rounded-lg bg-black px-4 py-2 font-medium text-white" type="submit">
              Add category
            </button>
          </form>

          <form action={createMenuItem} className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Add menu item</h2>
            <input type="hidden" name="restaurantId" value={restaurant.id} />

            {restaurant.menuCategories.length === 0 ? (
              <p className="mt-4 text-sm text-gray-600">Create a category first, then you can add food to it.</p>
            ) : (
              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="item-category" className="block text-sm font-medium">Category</label>
                  <select id="item-category" name="categoryId" required className="mt-2 w-full rounded-lg border px-3 py-2">
                    {restaurant.menuCategories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="item-name" className="block text-sm font-medium">Item name</label>
                  <input id="item-name" name="name" required placeholder="Jollof Rice" className="mt-2 w-full rounded-lg border px-3 py-2" />
                </div>
                <div>
                  <label htmlFor="item-description" className="block text-sm font-medium">Description</label>
                  <textarea id="item-description" name="description" placeholder="Optional description" className="mt-2 w-full rounded-lg border px-3 py-2" />
                </div>
                <div>
                  <label htmlFor="item-price" className="block text-sm font-medium">Price (₦)</label>
                  <input id="item-price" name="price" type="number" min="0.01" step="0.01" required placeholder="2500" className="mt-2 w-full rounded-lg border px-3 py-2" />
                </div>
                <button className="rounded-lg bg-black px-4 py-2 font-medium text-white" type="submit">Add item</button>
              </div>
            )}
          </form>
        </section>

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-semibold">Menu</h2>
            <p className="mt-1 text-sm text-gray-500">Items marked unavailable stay on the menu but cannot be ordered.</p>
          </div>

          {restaurant.menuCategories.length === 0 ? (
            <p className="mt-6 rounded-lg bg-gray-50 p-4 text-gray-600">No menu categories yet.</p>
          ) : (
            <div className="mt-6 space-y-8">
              {restaurant.menuCategories.map((category) => (
                <div key={category.id}>
                  <h3 className="text-lg font-semibold">{category.name}</h3>
                  {category.menuItems.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-500">No items in this category yet.</p>
                  ) : (
                    <div className="mt-3 divide-y rounded-lg border">
                      {category.menuItems.map((item) => (
                        <div key={item.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{item.name}</p>
                              {!item.isAvailable && (
                                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">Unavailable</span>
                              )}
                            </div>
                            {item.description && <p className="mt-1 text-sm text-gray-500">{item.description}</p>}
                            <p className="mt-2 font-semibold">₦{Number(item.price).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                          </div>
                          <form action={toggleMenuItemAvailability}>
                            <input type="hidden" name="restaurantId" value={restaurant.id} />
                            <input type="hidden" name="menuItemId" value={item.id} />
                            <button type="submit" className="rounded-lg border px-3 py-2 text-sm font-medium">
                              Mark {item.isAvailable ? "unavailable" : "available"}
                            </button>
                          </form>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}