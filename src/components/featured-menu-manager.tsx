"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Bike,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Minus,
  Navigation,
  Pencil,
  Plus,
  Sandwich,
  Search,
  ShoppingBag,
  Star,
  Trash2,
  Utensils,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  archiveDashboardMenuItem,
  createDashboardCategory,
  createDashboardMenuItem,
  createFeaturedCombo,
  deleteDashboardCategory,
  deleteFeaturedCombo,
  toggleDashboardMenuItemAvailability,
  updateDashboardCategory,
  updateDashboardMenuItem,
  updateFeaturedComboItems,
  updateFeaturedComboTimes,
} from "@/actions/featured-menu";
import { useUploadThing } from "@/lib/uploadthing";

export type FeaturedMenuItemData = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  readyMin: number;
  readyMax: number;
  deliverySeconds: number;
  categoryId: string;
  categoryName: string;
};

export type FeaturedComboData = {
  id: string;
  name: string;
  readyMin: number;
  readyMax: number;
  deliverySeconds: number;
  ratingAverage: number | null;
  ratingCount: number;
  items: Array<{
    id: string;
    quantity: number;
    menuItem: FeaturedMenuItemData;
  }>;
};

export type MenuCategoryData = {
  id: string;
  name: string;
  itemCount: number;
};

export type FeaturedPastOrderData = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
};

type RestaurantData = {
  name: string;
  address: string | null;
  imageUrl: string | null;
  isVerified: boolean;
};

const moneyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function money(value: number) {
  return moneyFormatter.format(value);
}

function comboTotal(combo: FeaturedComboData) {
  return combo.items.reduce(
    (sum, item) => sum + item.quantity * item.menuItem.price,
    0
  );
}

function totalQuantity(combo: FeaturedComboData) {
  return combo.items.reduce((sum, item) => sum + item.quantity, 0);
}

function formatPastOrderTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function MenuThumb({
  item,
  size = "md",
}: {
  item: FeaturedMenuItemData;
  size?: "sm" | "md";
}) {
  const classes = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  return item.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.imageUrl}
      alt={item.name}
      className={`${classes} shrink-0 rounded-[8px] border border-white/20 object-cover`}
    />
  ) : (
    <span
      className={`grid ${classes} shrink-0 place-items-center rounded-[8px] bg-[#2A2A2A] text-white`}
    >
      <Utensils className="h-4 w-4" strokeWidth={2.3} />
    </span>
  );
}

function ComboThumb({ combo }: { combo: FeaturedComboData }) {
  const item = combo.items[0]?.menuItem;

  return item ? (
    <MenuThumb item={item} size="sm" />
  ) : (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-[#2A2A2A]">
      <Utensils className="h-4 w-4" strokeWidth={2.3} />
    </span>
  );
}

function RestaurantMeta({ restaurant }: { restaurant: RestaurantData }) {
  return (
    <>
      <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-[8px] bg-white/10">
        {restaurant.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.imageUrl}
            alt={restaurant.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <ShoppingBag className="h-5 w-5" strokeWidth={2.3} />
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h2 className="text-[20px] font-medium leading-none tracking-[-0.04em] text-white">
          {restaurant.name}
        </h2>
        {restaurant.isVerified ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#969696]">
            <BadgeCheck className="h-3.5 w-3.5 fill-current" strokeWidth={2.3} />
            Verified by Paperbag
          </span>
        ) : null}
        {restaurant.address ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#969696]">
            <Navigation className="h-3.5 w-3.5 fill-current" strokeWidth={2.3} />
            {restaurant.address}
          </span>
        ) : null}
      </div>
    </>
  );
}

function ComboExpandedDetails({
  combo,
  compact = false,
}: {
  combo: FeaturedComboData;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "mt-3 pl-[56px]" : "mt-5 pl-[56px]"}>
      <div className="space-y-2.5">
        {combo.items.map((entry) => (
          <div
            key={entry.id}
            className="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-x-2 text-[11px]"
          >
            <span className="text-[#858585]">x{entry.quantity}</span>
            <span className="truncate font-medium text-white">
              {entry.menuItem.name}
            </span>
            <span className="shrink-0 text-[#858585]">
              {money(entry.menuItem.price * entry.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2 text-[11px] text-[#858585]">
        <p className="flex items-center gap-1.5">
          <UtensilsCrossed className="h-3.5 w-3.5" strokeWidth={2.3} />
          Ready within{" "}
          <span className="font-semibold text-white">
            {combo.readyMin}-{combo.readyMax}
          </span>{" "}
          minutes
        </p>
        <p className="flex items-center gap-1.5">
          <Bike className="h-3.5 w-3.5" strokeWidth={2.3} />
          Delivery in{" "}
          <span className="font-semibold text-white">
            &lt;{combo.deliverySeconds}
          </span>{" "}
          seconds
        </p>
        <p className="text-[9px] text-[#686868]">
          Ensure these claims are accurate.
        </p>
      </div>
    </div>
  );
}

function ModalFrame({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 p-4 backdrop-blur-[1px] sm:p-8">
      <div className="relative h-[min(760px,90vh)] w-[min(1200px,94vw)] overflow-hidden rounded-[12px] bg-black shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-5 top-5 z-20 grid h-8 w-8 place-items-center rounded-full text-white"
        >
          <X className="h-5 w-5" strokeWidth={2.3} />
        </button>
        {children}
      </div>
    </div>
  );
}

function NestedModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4">
      <div className="flex max-h-[82vh] w-[min(500px,92vw)] flex-col overflow-hidden rounded-[10px] border border-white/10 bg-black text-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4">
          <h3 className="text-[14px] font-semibold tracking-[-0.02em]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 place-items-center"
          >
            <X className="h-4 w-4" strokeWidth={2.3} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MenuImagePicker({
  value,
  onChange,
  onUploadingChange,
}: {
  value: string;
  onChange: (url: string) => void;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const { startUpload } = useUploadThing("menuImage", {
    onClientUploadComplete(files) {
      const url = files?.[0]?.ufsUrl;
      if (url) onChange(url);
      setUploading(false);
      onUploadingChange(false);
    },
    onUploadError() {
      setUploading(false);
      onUploadingChange(false);
    },
  });

  return (
    <label className="block rounded-[8px] border border-[#2A2A2A] p-3">
      <span className="block text-[11px] text-[#7F7F7F]">Image</span>
      <span className="mt-2 flex h-8 cursor-pointer items-center justify-center rounded-[6px] bg-[#333333] text-[11px] font-semibold text-white">
{uploading ? "Uploading..." : value ? "Change Image" : "Upload Image"}
      </span>
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={uploading}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setUploading(true);
          onUploadingChange(true);
          await startUpload([file]);
        }}
      />
    </label>
  );
}

export function FeaturedMenuManager({
  restaurantId,
  restaurant,
  menuItems,
  combos,
  pastOrders,
  categories,
}: {
  restaurantId: string;
  restaurant: RestaurantData;
  menuItems: FeaturedMenuItemData[];
  combos: FeaturedComboData[];
  pastOrders: FeaturedPastOrderData[];
  categories: MenuCategoryData[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [manager, setManager] = useState<"combos" | "menu" | null>(null);
  const [selectedComboId, setSelectedComboId] = useState(combos[0]?.id ?? "");
  const [expandedComboId, setExpandedComboId] = useState<string | null>(null);
  const [selectedMenuId, setSelectedMenuId] = useState(menuItems[0]?.id ?? "");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [nested, setNested] = useState<
    "newCombo" | "editCombo" | "newItem" | "editItem" | "times" | "categories" | null
  >(null);
  const [query, setQuery] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemImage, setItemImage] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState(categories[0]?.id ?? "");
  const [itemReadyMin, setItemReadyMin] = useState("1");
  const [itemReadyMax, setItemReadyMax] = useState("5");
  const [itemDeliverySeconds, setItemDeliverySeconds] = useState("45");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: "combo"; id: string; name: string }
    | { kind: "menuItem"; id: string; name: string }
    | { kind: "comboEntry"; id: string; name: string }
    | { kind: "category"; id: string; name: string }
    | null
  >(null);
  const [error, setError] = useState("");

  const selectedCombo =
    combos.find((combo) => combo.id === selectedComboId) ?? combos[0] ?? null;
  const selectedMenu =
    menuItems.find((item) => item.id === selectedMenuId) ?? menuItems[0] ?? null;
  const selectedComboIndex = selectedCombo
    ? Math.max(1, combos.findIndex((combo) => combo.id === selectedCombo.id) + 1)
    : 0;

  const filteredMenu = useMemo(() => {
    const q = query.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesQuery = !q || item.name.toLowerCase().includes(q);
      const matchesCategory = !selectedCategoryId || item.categoryId === selectedCategoryId;
      return matchesQuery && matchesCategory;
    });
  }, [menuItems, query, selectedCategoryId]);

  function run(
    action: (formData: FormData) => Promise<void>,
    formData: FormData,
    onDone?: () => void
  ) {
    setError("");
    startTransition(async () => {
      try {
        await action(formData);
        onDone?.();
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Something went wrong.");
      }
    });
  }

  function openComboBuilder(combo?: FeaturedComboData) {
    setQuery("");
    setQuantities(
      combo
        ? Object.fromEntries(
            combo.items.map((entry) => [entry.menuItem.id, entry.quantity])
          )
        : {}
    );
    setNested(combo ? "editCombo" : "newCombo");
  }

  function openNewItem() {
    setItemName("");
    setItemPrice("");
    setItemImage("");
    setItemCategoryId(selectedCategoryId || categories[0]?.id || "");
    setItemReadyMin("1");
    setItemReadyMax("5");
    setItemDeliverySeconds("45");
    setImageUploading(false);
    setNested("newItem");
  }

  function openEditItem(item: FeaturedMenuItemData) {
    setSelectedMenuId(item.id);
    setItemName(item.name);
    setItemPrice(String(item.price));
    setItemImage(item.imageUrl ?? "");
    setItemCategoryId(item.categoryId);
    setItemReadyMin(String(item.readyMin));
    setItemReadyMax(String(item.readyMax));
    setItemDeliverySeconds(String(item.deliverySeconds));
    setImageUploading(false);
    setNested("editItem");
  }

  function submitCombo(editing: boolean) {
    const formData = new FormData();
    formData.set("restaurantId", restaurantId);
    formData.set("items", JSON.stringify(quantities));
    if (editing && selectedCombo) formData.set("comboId", selectedCombo.id);

    run(
      editing ? updateFeaturedComboItems : createFeaturedCombo,
      formData,
      () => setNested(null)
    );
  }

  function deleteCombo(comboId: string) {
    const formData = new FormData();
    formData.set("restaurantId", restaurantId);
    formData.set("comboId", comboId);
    run(deleteFeaturedCombo, formData, () => {
      if (selectedComboId === comboId) setSelectedComboId("");
    });
  }

  function submitItem(editing: boolean) {
    const formData = new FormData();
    formData.set("restaurantId", restaurantId);
    formData.set("name", itemName);
    formData.set("price", itemPrice);
    formData.set("imageUrl", itemImage);
    formData.set("categoryId", itemCategoryId);
    formData.set("readyMin", itemReadyMin);
    formData.set("readyMax", itemReadyMax);
    formData.set("deliverySeconds", itemDeliverySeconds);
    if (editing && selectedMenu) formData.set("menuItemId", selectedMenu.id);

    run(
      editing ? updateDashboardMenuItem : createDashboardMenuItem,
      formData,
      () => setNested(null)
    );
  }

  function archiveItem(itemId: string) {
    const formData = new FormData();
    formData.set("restaurantId", restaurantId);
    formData.set("menuItemId", itemId);
    run(archiveDashboardMenuItem, formData, () => setNested(null));
  }

  function confirmDelete() {
    if (!deleteTarget) return;

    if (deleteTarget.kind === "combo") {
      deleteCombo(deleteTarget.id);
    } else if (deleteTarget.kind === "menuItem") {
      archiveItem(deleteTarget.id);
    } else if (deleteTarget.kind === "category") {
      const formData = new FormData();
      formData.set("restaurantId", restaurantId);
      formData.set("categoryId", deleteTarget.id);
      run(deleteDashboardCategory, formData, () => {
        if (selectedCategoryId === deleteTarget.id) setSelectedCategoryId(null);
      });
    } else {
      setQuantities((current) => ({
        ...current,
        [deleteTarget.id]: 0,
      }));
    }

    setDeleteTarget(null);
  }

  return (
    <>
      <section className="flex min-h-[682px] w-full flex-col rounded-[12px] bg-black px-6 py-6 text-white sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <RestaurantMeta restaurant={restaurant} />
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("paperbag:edit-restaurant"))}
            className="mt-[62px] shrink-0 text-[11px] font-semibold underline underline-offset-2"
          >
            Edit Restaurant
          </button>
        </div>

        <p className="mt-5 text-[11px] font-medium text-[#7C7C7C]">
          Featured Combos
        </p>

        <div className="mt-3 flex-1 divide-y divide-white/10">
          {combos.length === 0 ? (
            <div className="grid min-h-[360px] place-items-center text-center">
              <div>
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-[10px] border border-white/10 bg-[#151515] text-[#858585]">
                  <Utensils className="h-5 w-5" strokeWidth={2.3} />
                </span>
                <p className="mt-3 text-[12px] font-semibold">No featured combos yet</p>
                <p className="mt-1 max-w-[280px] text-[10px] leading-[1.5] text-[#707070]">
                  Choose items from your menu and turn them into a featured combo.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setManager("combos");
                    openComboBuilder();
                  }}
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold underline underline-offset-2"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.3} />
                  Create your first combo
                </button>
              </div>
            </div>
          ) : (
            combos.slice(0, 3).map((combo, index) => {
              const expanded = expandedComboId === combo.id;

              return (
                <article key={combo.id} className="py-5 first:pt-0">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedComboId((current) =>
                          current === combo.id ? null : combo.id
                        )
                      }
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      aria-expanded={expanded}
                    >
                      <span className="pt-2 text-[12px] font-semibold">#{index + 1}</span>
                      <ComboThumb combo={combo} />
                      <div className="min-w-0 flex-1 pt-1">
                        <p className="truncate text-[12px] font-medium leading-none">
                          {combo.name}
                        </p>
                        <p className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-[#858585]">
                          <Star className="h-3.5 w-3.5" strokeWidth={2.3} />
                          <span>{combo.ratingAverage === null ? "—/5" : `${combo.ratingAverage.toFixed(1)}/5`}</span>
                          <span>•</span>
                          <span>{money(comboTotal(combo))} total</span>
                        </p>
                      </div>
                      {expanded ? (
                        <ChevronUp className="mt-2 h-4 w-4 shrink-0 text-[#858585]" strokeWidth={2.3} />
                      ) : (
                        <ChevronDown className="mt-2 h-4 w-4 shrink-0 text-[#858585]" strokeWidth={2.3} />
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedComboId(combo.id);
                          setManager("combos");
                        }}
                        className="rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-medium"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({ kind: "combo", id: combo.id, name: combo.name })
                        }
                        className="grid h-7 w-7 place-items-center rounded-full bg-[#520000] text-red-500"
                        aria-label={`Delete ${combo.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.3} />
                      </button>
                    </div>
                  </div>

                  {expanded ? <ComboExpandedDetails combo={combo} /> : null}
                </article>
              );
            })
          )}
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setManager("menu")}
            className="h-9 rounded-[8px] bg-white text-[11px] font-semibold text-black"
          >
            <ClipboardList className="mr-1 inline h-3.5 w-3.5" strokeWidth={2.3} />
            Edit Full Menu
          </button>
          <button
            type="button"
            onClick={() => setManager("combos")}
            className="h-9 rounded-[8px] border border-white/20 text-[11px] font-semibold text-white"
          >
            <Pencil className="mr-1 inline h-3.5 w-3.5 fill-current" strokeWidth={2.3} />
            Change Featured Combos
          </button>
        </div>
      </section>

      {manager ? (
        <ModalFrame
          onClose={() => {
            setManager(null);
            setNested(null);
            setError("");
          }}
        >
          <div className="grid h-full overflow-y-auto lg:grid-cols-[40%_60%] lg:overflow-hidden">
            <aside className="flex min-h-[520px] flex-col bg-[#1D1D1D] px-6 py-6 text-white">
              <RestaurantMeta restaurant={restaurant} />

              <p className="mt-4 text-[11px] font-medium text-[#858585]">
                {manager === "combos" ? "Featured Combos" : "Menu Items"}
              </p>

              {manager === "menu" ? (
                <>
                  <label className="mt-3 flex h-9 items-center gap-2 rounded-[8px] border border-[#3B3B3B] px-3 text-[#8E8E8E]">
                    <Search className="h-4 w-4" strokeWidth={2.3} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Find something..."
                      className="w-full bg-transparent text-[11px] text-white outline-none placeholder:text-[#8E8E8E]"
                    />
                  </label>

                  <div className="mt-3 flex items-center gap-2">
                    <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <div className="flex w-max gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCategoryId(null)}
                          className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[9px] font-semibold ${selectedCategoryId === null ? "border-white bg-white text-black" : "border-white/15 text-white"}`}
                        >
                          All
                        </button>
                        {categories.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => setSelectedCategoryId(category.id)}
                            className={`shrink-0 rounded-full border px-2.5 py-1.5 text-[9px] font-semibold ${selectedCategoryId === category.id ? "border-white bg-white text-black" : "border-white/15 text-white"}`}
                          >
                            {category.name}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNested("categories")}
                      className="shrink-0 text-[9px] font-semibold text-[#A0A0A0] underline underline-offset-2"
                    >
                      Manage
                    </button>
                  </div>
                </>
              ) : null}

              <div className="mt-3 flex-1 overflow-y-auto">
                {manager === "combos" && combos.length === 0 ? (
                  <div className="grid h-full min-h-[260px] place-items-center px-6 text-center">
                    <div>
                      <span className="mx-auto grid h-11 w-11 place-items-center rounded-[10px] border border-white/10 bg-[#252525] text-[#9A9A9A]">
                        <Utensils className="h-5 w-5" strokeWidth={2.3} />
                      </span>
                      <p className="mt-3 text-[12px] font-semibold">No featured combos yet</p>
                      <p className="mt-1 max-w-[220px] text-[10px] leading-[1.4] text-[#777777]">
                        Build a combo from menu items and it will appear here.
                      </p>
                    </div>
                  </div>
                ) : manager === "menu" && filteredMenu.length === 0 ? (
                  <div className="grid h-full min-h-[260px] place-items-center px-6 text-center">
                    <div>
                      <span className="mx-auto grid h-11 w-11 place-items-center rounded-[10px] border border-white/10 bg-[#252525] text-[#9A9A9A]">
                        <Utensils className="h-5 w-5" strokeWidth={2.3} />
                      </span>
                      <p className="mt-3 text-[12px] font-semibold">
                        {menuItems.length === 0 ? "Your menu is empty" : "No items in this view"}
                      </p>
                      <p className="mt-1 max-w-[220px] text-[10px] leading-[1.4] text-[#777777]">
                        {menuItems.length === 0
                          ? "Add your first menu item to start building the restaurant menu."
                          : "Switch category filters or clear your search to see more items."}
                      </p>
                    </div>
                  </div>
                ) : manager === "combos"
                  ? combos.map((combo, index) => (
                      <button
                        type="button"
                        key={combo.id}
                        onClick={() => setSelectedComboId(combo.id)}
                        className={`flex w-full items-center gap-3 border-b border-white/10 px-3 py-4 text-left ${selectedCombo?.id === combo.id ? "bg-[#303030]" : ""}`}
                      >
                        <span className="text-[11px] font-semibold">#{index + 1}</span>
                        <ComboThumb combo={combo} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-medium">
                            {combo.name}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-[9px] text-[#8B8B8B]">
                            <Star className="h-3 w-3" strokeWidth={2.3} />
                            <span>{combo.ratingAverage === null ? "—/5" : `${combo.ratingAverage.toFixed(1)}/5`}</span>
                            <span>•</span>
                            <span>{money(comboTotal(combo))} total</span>
                          </p>
                        </div>
                        <span className="rounded-full border border-white/15 px-3 py-1.5 text-[9px] font-medium">
                          Edit
                        </span>
                      </button>
                    ))
                  : filteredMenu.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setSelectedMenuId(item.id)}
                        className={`flex w-full items-center gap-3 border-b border-white/10 px-3 py-4 text-left ${selectedMenu?.id === item.id ? "bg-[#303030]" : ""}`}
                      >
                        <MenuThumb item={item} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-medium">{item.name}</p>
                          <p className="mt-1 text-[9px] text-[#8B8B8B]">{money(item.price)}</p>
                        </div>
                        <span className="rounded-full border border-white/15 px-3 py-1.5 text-[9px] font-medium">
                          Edit
                        </span>
                      </button>
                    ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  manager === "combos" ? openComboBuilder() : openNewItem()
                }
                className="mt-4 h-9 rounded-[8px] border border-white/15 text-[11px] font-semibold"
              >
                <Plus className="mr-1 inline h-3.5 w-3.5" strokeWidth={2.3} />
                {manager === "combos" ? "New Combo" : "New Menu Item"}
              </button>
            </aside>

            <section className="min-h-[520px] overflow-y-auto bg-black px-6 py-6 text-white lg:px-8">
              {manager === "combos" ? (
                selectedCombo ? (
                  <>
                    <p className="text-[14px] font-medium leading-none text-[#7A7A7A]">
                      Edit Combo
                    </p>

                    <div className="mt-6 flex items-start gap-3">
                      <span className="pt-2 text-[12px] font-semibold">#{selectedComboIndex}</span>
                      <ComboThumb combo={selectedCombo} />
                      <div className="min-w-0 flex-1 pt-1">
                        <p className="truncate text-[13px] font-medium">{selectedCombo.name}</p>
                        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-[#858585]">
                          <Star className="h-3.5 w-3.5" strokeWidth={2.3} />
                          <span>{selectedCombo.ratingAverage === null ? "—/5" : `${selectedCombo.ratingAverage.toFixed(1)}/5`}</span>
                          <span>•</span>
                          <span>{money(comboTotal(selectedCombo))} total</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            kind: "combo",
                            id: selectedCombo.id,
                            name: selectedCombo.name,
                          })
                        }
                        aria-label={`Delete ${selectedCombo.name}`}
                        className="grid h-8 w-8 place-items-center rounded-full bg-[#520000] text-red-500"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={2.3} />
                      </button>
                    </div>

                    <ComboExpandedDetails combo={selectedCombo} />

                    <div className="mt-5 space-y-2">
                      <button
                        type="button"
                        onClick={() => openComboBuilder(selectedCombo)}
                        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[8px] bg-white text-[11px] font-semibold text-black"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2.3} />
                        Add Items
                      </button>
                      <button
                        type="button"
                        onClick={() => setNested("times")}
                        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[8px] border border-white/20 text-[11px] font-semibold"
                      >
                        <Pencil className="h-3.5 w-3.5 fill-current" strokeWidth={2.3} />
                        Adjust Times
                      </button>
                    </div>

                    <div className="mt-8 border-t border-white/10 pt-5">
                      <p className="text-[11px] font-medium text-[#858585]">Past Orders</p>
                      <div className="mt-3 divide-y divide-white/10">
                        {pastOrders.slice(0, 7).map((order) => (
                          <div key={order.id} className="flex items-center justify-between py-4 text-[10px]">
                            <div>
                              <p className="font-medium text-white">#{order.orderNumber}</p>
                              <p className="mt-1 text-[#858585]">{formatPastOrderTime(order.createdAt)}</p>
                            </div>
                            <span
                              className={
                                order.status === "DELIVERED"
                                  ? "text-green-500"
                                  : order.status === "CANCELLED"
                                    ? "text-red-500"
                                    : "text-[#858585]"
                              }
                            >
                              {order.status === "PICKED_UP"
                                ? "Picked up"
                                : order.status.charAt(0) +
                                  order.status.slice(1).toLowerCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="grid h-full min-h-[420px] place-items-center text-center">
                    <div>
                      <span className="mx-auto grid h-12 w-12 place-items-center rounded-[10px] border border-white/10 bg-[#171717] text-[#8B8B8B]">
                        <Utensils className="h-5 w-5" strokeWidth={2.3} />
                      </span>
                      <p className="mt-3 text-[13px] font-semibold">No featured combos yet</p>
                      <p className="mt-1 max-w-[260px] text-[10px] leading-[1.5] text-[#777777]">
                        Build your first combo from the menu items on this restaurant.
                      </p>
                      <button
                        type="button"
                        onClick={() => openComboBuilder()}
                        className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold underline underline-offset-2"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2.3} />
                        Create a combo
                      </button>
                    </div>
                  </div>
                )
              ) : selectedMenu ? (
                <>
                  <p className="text-[12px] font-medium text-[#808080]">Edit Item</p>
                  <div className="mt-5 flex items-start gap-3">
                    <MenuThumb item={selectedMenu} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium">{selectedMenu.name}</p>
                      <p className="mt-1 text-[10px] text-[#858585]">
                        {money(selectedMenu.price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          kind: "menuItem",
                          id: selectedMenu.id,
                          name: selectedMenu.name,
                        })
                      }
                      className="grid h-8 w-8 place-items-center rounded-full bg-[#520000] text-red-500"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2.3} />
                    </button>
                  </div>

                  <div className="mt-5 space-y-2 text-[11px] text-[#858585]">
                    <p className="flex items-center gap-1.5">
                      <UtensilsCrossed className="h-3.5 w-3.5" strokeWidth={2.3} />
                      Ready within{" "}
                      <span className="font-semibold text-white">
                        {selectedMenu.readyMin}-{selectedMenu.readyMax}
                      </span>{" "}
                      minutes
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Bike className="h-3.5 w-3.5" strokeWidth={2.3} />
                      Delivery in{" "}
                      <span className="font-semibold text-white">
                        &lt;{selectedMenu.deliverySeconds}
                      </span>{" "}
                      seconds
                    </p>
                    <p className="text-[9px] text-[#686868]">
                      Ensure these claims are accurate.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditItem(selectedMenu)}
                    className="mt-3 h-9 w-full rounded-[8px] border border-white/20 text-[11px] font-semibold"
                  >
                    <Pencil className="mr-1 inline h-3.5 w-3.5 fill-current" strokeWidth={2.3} />
                    Edit Item
                  </button>

                  <div className="mt-6 border-t border-white/10 pt-5">
                    <p className="text-[11px] font-medium text-[#858585]">Past Orders</p>
                    <div className="mt-3 divide-y divide-white/10">
                      {pastOrders.slice(0, 8).map((order) => (
                        <div key={order.id} className="flex items-center justify-between py-4 text-[10px]">
                          <div>
                            <p className="font-medium">#{order.orderNumber}</p>
                            <p className="mt-1 text-[#858585]">{formatPastOrderTime(order.createdAt)}</p>
                          </div>
                          <span
                            className={
                              order.status === "DELIVERED"
                                ? "text-green-500"
                                : order.status === "CANCELLED"
                                  ? "text-red-500"
                                  : "text-[#858585]"
                            }
                          >
                            {order.status === "PICKED_UP"
                              ? "Picked up"
                              : order.status.charAt(0) +
                                order.status.slice(1).toLowerCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid h-full min-h-[420px] place-items-center text-center">
                  <div>
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-[10px] border border-white/10 bg-[#171717] text-[#8B8B8B]">
                      <Utensils className="h-5 w-5" strokeWidth={2.3} />
                    </span>
                    <p className="mt-3 text-[13px] font-semibold">No menu items yet</p>
                    <p className="mt-1 max-w-[260px] text-[10px] leading-[1.5] text-[#777777]">
                      Create a menu item from the left panel to begin building your menu.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </ModalFrame>
      ) : null}

      {nested === "newCombo" || nested === "editCombo" ? (
        <NestedModal
          title={nested === "newCombo" ? "New Combo" : "Edit Combo"}
          onClose={() => setNested(null)}
        >
          <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
            {nested === "editCombo" && selectedCombo ? (
              <div className="mb-4">
                <div className="flex items-start gap-3">
                  <ComboThumb combo={selectedCombo} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium">{selectedCombo.name}</p>
                    <p className="mt-1 flex items-center gap-1 text-[9px] text-[#858585]">
                      <Star className="h-3 w-3" strokeWidth={2.3} />
                      <span>{selectedCombo.ratingAverage === null ? "—/5" : `${selectedCombo.ratingAverage.toFixed(1)}/5`}</span>
                      <span>•</span>
                      <span>{money(comboTotal(selectedCombo))} total</span>
                    </p>
                  </div>
                </div>
                <div className="ml-1 mt-3 space-y-2">
                  {selectedCombo.items.map((entry) => (
                    <div key={entry.id} className="grid grid-cols-[26px_minmax(0,1fr)_auto_24px] items-center gap-2 text-[10px]">
                      <span className="text-[#777777]">x{entry.quantity}</span>
                      <span className="truncate">{entry.menuItem.name}</span>
                      <span className="text-[#858585]">
                        {money(entry.menuItem.price * entry.quantity)}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            kind: "comboEntry",
                            id: entry.menuItem.id,
                            name: entry.menuItem.name,
                          })
                        }
                        className="grid h-6 w-6 place-items-center text-red-500"
                        aria-label={`Remove ${entry.menuItem.name} from combo`}
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.3} />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[10px] font-medium text-[#777777]">New additions</p>
              </div>
            ) : null}

            <label className="flex h-10 items-center gap-2 rounded-[8px] border border-[#333333] px-3">
              <Search className="h-4 w-4 text-[#8A8A8A]" strokeWidth={2.3} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search Menu Items..."
                className="w-full bg-transparent text-[11px] outline-none placeholder:text-[#777777]"
              />
            </label>

            <div className="mt-4 flex-1 overflow-y-auto">
              <div className="mb-2 flex items-center justify-between text-[11px] text-[#777777]">
                <span>Menu Items</span>
                <span>{money(menuItems.reduce((sum, item) => sum + item.price, 0))}</span>
              </div>
              <div className="divide-y divide-[#292929]">
                {filteredMenu.length === 0 ? (
                  <div className="grid min-h-[220px] place-items-center text-center">
                    <div>
                      <span className="mx-auto grid h-11 w-11 place-items-center rounded-[10px] border border-white/10 bg-[#171717] text-[#858585]">
                        <Utensils className="h-5 w-5" strokeWidth={2.3} />
                      </span>
                      <p className="mt-3 text-[11px] font-semibold">
                        {menuItems.length === 0 ? "No menu items yet" : "No matching menu items"}
                      </p>
                      <p className="mt-1 text-[9px] text-[#707070]">
                        {menuItems.length === 0
                          ? "Create menu items first, then add them to a combo."
                          : "Try another search."}
                      </p>
                    </div>
                  </div>
                ) : filteredMenu.map((item) => {
                  const qty = quantities[item.id] ?? 0;
                  return (
                    <div key={item.id} className="flex items-center gap-3 py-3">
                      <MenuThumb item={item} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-medium">{item.name}</p>
                        <p className="mt-1 text-[10px] text-[#858585]">{money(item.price)}</p>
                      </div>
                      <div className="flex h-7 items-center rounded-full border border-white/15">
                        <button
                          type="button"
                          onClick={() =>
                            setQuantities((current) => ({
                              ...current,
                              [item.id]: Math.max(0, qty - 1),
                            }))
                          }
                          className="grid h-7 w-7 place-items-center text-[13px]"
                        >
                          <Minus className="h-3.5 w-3.5" strokeWidth={2.3} />
                        </button>
                        <span className="min-w-5 text-center text-[10px]">{qty}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setQuantities((current) => ({
                              ...current,
                              [item.id]: qty + 1,
                            }))
                          }
                          className="grid h-7 w-7 place-items-center text-[13px]"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={2.3} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-[11px]">
              <span>
                {Object.values(quantities).reduce((sum, value) => sum + value, 0)} Items
              </span>
              <span className="text-[#858585]">
                {money(
                  menuItems.reduce(
                    (sum, item) => sum + item.price * (quantities[item.id] ?? 0),
                    0
                  )
                )}{" "}
                total
              </span>
            </div>
            {error ? <p className="mt-2 text-[10px] text-red-500">{error}</p> : null}
            <button
              type="button"
              disabled={pending}
              onClick={() => submitCombo(nested === "editCombo")}
              className="mt-2 h-9 rounded-[8px] bg-white text-[11px] font-semibold text-black disabled:opacity-50"
            >
              <Plus className="mr-1 inline h-3.5 w-3.5" strokeWidth={2.3} />
              {nested === "newCombo" ? "Create Combo" : "Save Combo"}
            </button>
          </div>
        </NestedModal>
      ) : null}

      {nested === "newItem" || nested === "editItem" ? (
        <NestedModal
          title={nested === "newItem" ? "Create Menu Item" : "Edit Menu Item"}
          onClose={() => setNested(null)}
        >
          <div className="px-5 pb-5">
            <div className="mb-4 flex items-center gap-3">
              {itemImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={itemImage}
                  alt={itemName || "Menu item preview"}
                  className="h-11 w-11 shrink-0 rounded-[8px] border border-white/10 object-cover"
                />
              ) : (
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] bg-[#242424] text-[#8A8A8A]">
                  <Sandwich className="h-5 w-5" strokeWidth={2.3} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium">
                  {itemName || "Item name"}
                </p>
                <p className="mt-1 text-[10px] text-[#858585]">
                  {Number(itemPrice.replaceAll(",", "")) > 0
                    ? money(Number(itemPrice.replaceAll(",", "")))
                    : "₦0"}
                </p>
              </div>
              {nested === "editItem" && selectedMenu ? (
                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget({
                      kind: "menuItem",
                      id: selectedMenu.id,
                      name: selectedMenu.name,
                    })
                  }
                  className="grid h-8 w-8 place-items-center rounded-full bg-[#520000] text-red-500"
                  aria-label={`Remove ${selectedMenu.name}`}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2.3} />
                </button>
              ) : null}
            </div>

            <div className="space-y-3">
              <label className="block rounded-[8px] border border-[#2A2A2A] px-3 py-2">
                <span className="block text-[11px] text-[#777777]">Name</span>
                <input
                  value={itemName}
                  onChange={(event) => setItemName(event.target.value)}
                  placeholder="Item name"
                  className="mt-1 w-full bg-transparent text-[12px] outline-none"
                />
              </label>
              <label className="block rounded-[8px] border border-[#2A2A2A] px-3 py-2">
                <span className="block text-[11px] text-[#777777]">Price</span>
                <input
                  value={itemPrice}
                  onChange={(event) => setItemPrice(event.target.value)}
                  inputMode="decimal"
                  placeholder="₦0"
                  className="mt-1 w-full bg-transparent text-[12px] outline-none"
                />
              </label>
              <MenuImagePicker
                value={itemImage}
                onChange={setItemImage}
                onUploadingChange={setImageUploading}
              />
            </div>

            {error ? <p className="mt-3 text-[10px] text-red-500">{error}</p> : null}
            <button
              type="button"
              disabled={pending || imageUploading}
              onClick={() => submitItem(nested === "editItem")}
              className="mt-24 h-9 w-full rounded-[8px] bg-white text-[11px] font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              {imageUploading ? (
                "Uploading image..."
              ) : nested === "newItem" ? (
                <>
                  <Plus className="mr-1 inline h-3.5 w-3.5" strokeWidth={2.3} />
                  Create Item
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </NestedModal>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/65 p-4">
          <div className="w-[min(430px,92vw)] rounded-[12px] border border-white/10 bg-black p-5 text-white shadow-2xl">
            <span className="grid h-10 w-10 place-items-center rounded-[10px] bg-[#3A1600] text-amber-400">
              <AlertTriangle className="h-5 w-5" strokeWidth={2.3} />
            </span>
            <h3 className="mt-4 text-[14px] font-semibold tracking-[-0.02em]">
              {deleteTarget.kind === "combo"
                ? "Delete featured combo?"
                : deleteTarget.kind === "menuItem"
                  ? "Remove menu item?"
                  : "Remove item from combo?"}
            </h3>
            <p className="mt-2 text-[11px] leading-[1.5] text-[#858585]">
              {deleteTarget.kind === "combo"
                ? `“${deleteTarget.name}” will be removed from Featured Combos. Its menu items will stay in your full menu and past orders are unchanged.`
                : deleteTarget.kind === "menuItem"
                  ? `“${deleteTarget.name}” will be hidden from your restaurant menu and removed from every featured combo. Existing past order records will remain intact.`
                  : `“${deleteTarget.name}” will be removed from this combo only. The menu item itself will remain in your full menu.`}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="h-9 rounded-[8px] border border-white/15 text-[11px] font-semibold"
              >
                Keep it
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={confirmDelete}
                className="h-9 rounded-[8px] bg-red-600 text-[11px] font-semibold text-white disabled:opacity-50"
              >
                {deleteTarget.kind === "combo" ? "Delete Combo" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {nested === "times" && selectedCombo ? (
        <NestedModal title="Adjust Times" onClose={() => setNested(null)}>
          <form
            className="px-5 pb-5"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              formData.set("restaurantId", restaurantId);
              formData.set("comboId", selectedCombo.id);
              run(updateFeaturedComboTimes, formData, () => setNested(null));
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="rounded-[8px] border border-[#2A2A2A] px-3 py-2">
                <span className="block text-[10px] text-[#777777]">Ready min</span>
                <input
                  name="readyMin"
                  type="number"
                  min={0}
                  defaultValue={selectedCombo.readyMin}
                  className="mt-1 w-full bg-transparent text-[12px] outline-none"
                />
              </label>
              <label className="rounded-[8px] border border-[#2A2A2A] px-3 py-2">
                <span className="block text-[10px] text-[#777777]">Ready max</span>
                <input
                  name="readyMax"
                  type="number"
                  min={0}
                  defaultValue={selectedCombo.readyMax}
                  className="mt-1 w-full bg-transparent text-[12px] outline-none"
                />
              </label>
            </div>
            <label className="mt-3 block rounded-[8px] border border-[#2A2A2A] px-3 py-2">
              <span className="block text-[10px] text-[#777777]">Delivery seconds</span>
              <input
                name="deliverySeconds"
                type="number"
                min={1}
                defaultValue={selectedCombo.deliverySeconds}
                className="mt-1 w-full bg-transparent text-[12px] outline-none"
              />
            </label>
            {error ? <p className="mt-3 text-[10px] text-red-500">{error}</p> : null}
            <button
              disabled={pending}
              className="mt-5 h-9 w-full rounded-[8px] bg-white text-[11px] font-semibold text-black"
            >
              Save Times
            </button>
          </form>
        </NestedModal>
      ) : null}
    </>
  );
}
