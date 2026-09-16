import Link from "next/link";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

import { getOrCreateCurrentUser } from "@/lib/current-user";

const categories = [
  "Nigerian",
  "Grills",
  "Burgers",
  "Healthy",
  "Late night",
  "Desserts",
];

const restaurants = [
  {
    name: "Jollof & Co.",
    detail: "Nigerian · 20–30 min",
    rating: "4.9",
    tone: "bg-[#dc5a3d]",
    plate: "bg-[#f0c56b]",
    garnish: "bg-[#355640]",
  },
  {
    name: "Char & Spice",
    detail: "Grills · 25–35 min",
    rating: "4.8",
    tone: "bg-[#26382d]",
    plate: "bg-[#e8d8bd]",
    garnish: "bg-[#d96c45]",
  },
  {
    name: "Good Bowl",
    detail: "Healthy · 15–25 min",
    rating: "4.7",
    tone: "bg-[#d7bd79]",
    plate: "bg-[#f6efe3]",
    garnish: "bg-[#596d46]",
  },
];

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-4 w-4"
      fill="none"
    >
      <path
        d="M5 10h9m-3.5-3.5L14 10l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="10" r="2.2" fill="currentColor" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="M6 8.5h12l1 11H5l1-11Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M9 9V7a3 3 0 0 1 6 0v2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RestaurantArtwork({
  tone,
  plate,
  garnish,
}: {
  tone: string;
  plate: string;
  garnish: string;
}) {
  return (
    <div
      className={`relative aspect-[4/3] overflow-hidden rounded-[26px] ${tone}`}
      aria-hidden="true"
    >
      <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full border border-white/25" />
      <div className="absolute -bottom-8 -left-5 h-28 w-28 rounded-full border border-white/20" />
      <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fff9ef] p-3 shadow-[0_20px_50px_rgba(29,28,25,0.18)] sm:h-36 sm:w-36">
        <div className={`relative h-full w-full overflow-hidden rounded-full ${plate}`}>
          <div className="absolute left-[18%] top-[18%] h-[34%] w-[48%] rotate-[-12deg] rounded-full bg-[#a7442f]" />
          <div className="absolute bottom-[16%] right-[15%] h-[42%] w-[38%] rounded-full bg-[#7c4e2d]" />
          <div
            className={`absolute left-[16%] bottom-[15%] h-[32%] w-[32%] rounded-full ${garnish}`}
          />
          <div className="absolute right-[24%] top-[18%] h-3 w-3 rounded-full bg-[#fff4c8]" />
          <div className="absolute right-[17%] top-[30%] h-2 w-2 rounded-full bg-[#fff4c8]" />
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const user = await getOrCreateCurrentUser();

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4efe6] text-[#1f201c]">
      <header className="border-b border-[#1f201c]/10">
        <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-3" aria-label="OrderEats home">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#d9583b] text-sm font-black text-[#fff9ef]">
              OE
            </span>
            <span className="text-xl font-semibold tracking-[-0.04em]">OrderEats</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <a href="#discover" className="transition-opacity hover:opacity-60">
              Discover
            </a>
            <a href="#how-it-works" className="transition-opacity hover:opacity-60">
              How it works
            </a>
            <Link href="/restaurant/new" className="transition-opacity hover:opacity-60">
              For restaurants
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {!user ? (
              <>
                <SignInButton mode="modal">
                  <button className="hidden rounded-full px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-[#1f201c]/5 sm:block">
                    Sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="rounded-full bg-[#1f201c] px-4 py-2.5 text-sm font-semibold text-[#fff9ef] transition-transform hover:-translate-y-0.5 sm:px-5">
                    Get started
                  </button>
                </SignUpButton>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="hidden text-sm text-[#5f6059] sm:inline">
                  Hi, {user.firstName || "there"}
                </span>
                <UserButton />
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1400px] gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16 lg:px-12 lg:pb-28 lg:pt-24">
        <div className="max-w-3xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#1f201c]/15 bg-[#fff9ef]/60 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#55564f]">
            <span className="h-2 w-2 rounded-full bg-[#d9583b]" />
            Food, properly sorted
          </div>

          <h1 className="text-balance text-[clamp(3.35rem,7.2vw,7.6rem)] font-semibold leading-[0.88] tracking-[-0.075em]">
            Craving it?
            <span className="block text-[#d9583b]">Order it.</span>
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-8 text-[#62635c] sm:text-xl">
            Your favourite food, from the places you actually want to eat from.
            Mix restaurants in one order, track every part, and get back to your day.
          </p>

          <div className="mt-9 flex max-w-xl flex-col gap-3 rounded-[28px] border border-[#1f201c]/10 bg-[#fff9ef] p-2.5 shadow-[0_18px_60px_rgba(49,45,36,0.08)] sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-[#6c6d65]">
              <PinIcon />
              <span className="truncate text-sm sm:text-base">Enter your delivery address</span>
            </div>
            <a
              href="#discover"
              className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-[#d9583b] px-5 py-4 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              Find food
              <ArrowIcon />
            </a>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#707169]">
            {["One checkout", "Live order status", "Secure payments"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[#dce2d3] text-[10px] font-black text-[#355640]">
                  ✓
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[620px] lg:mx-0 lg:ml-auto">
          <div className="absolute -left-8 top-20 hidden h-28 w-28 rounded-full border border-[#d9583b]/25 lg:block" />
          <div className="relative rounded-[38px] bg-[#20231e] p-3 shadow-[0_32px_80px_rgba(31,32,28,0.22)] sm:p-4">
            <div className="rounded-[30px] bg-[#fff9ef] p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#98988f]">
                    Tonight&apos;s order
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
                    Three cravings. One basket.
                  </h2>
                </div>
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#f1dfd6] text-[#b8432d]">
                  <BagIcon />
                </div>
              </div>

              <div className="mt-7 space-y-3">
                <div className="flex items-center gap-4 rounded-[22px] border border-[#1f201c]/10 bg-white/60 p-3.5">
                  <div className="h-14 w-14 shrink-0 rounded-[17px] bg-[#d9583b] p-2.5">
                    <div className="h-full w-full rounded-full border-[5px] border-[#fff9ef] bg-[#e7bd60]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">Smoky party jollof</p>
                    <p className="mt-0.5 text-sm text-[#83837b]">Jollof & Co.</p>
                  </div>
                  <span className="text-sm font-semibold">₦4,800</span>
                </div>

                <div className="flex items-center gap-4 rounded-[22px] border border-[#1f201c]/10 bg-white/60 p-3.5">
                  <div className="h-14 w-14 shrink-0 rounded-[17px] bg-[#304236] p-2.5">
                    <div className="h-full w-full rounded-full border-[5px] border-[#fff9ef] bg-[#9a5c35]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">Spiced chicken skewers</p>
                    <p className="mt-0.5 text-sm text-[#83837b]">Char & Spice</p>
                  </div>
                  <span className="text-sm font-semibold">₦5,200</span>
                </div>
              </div>

              <div className="mt-5 rounded-[22px] bg-[#eee7da] p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6c6d65]">Restaurants</span>
                  <span className="font-semibold">2 kitchens</span>
                </div>
                <div className="mt-3 h-px bg-[#1f201c]/10" />
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold tracking-[-0.03em]">₦11,650</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-[22px] bg-[#d9583b] px-5 py-4 text-white">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                    Arrives in
                  </p>
                  <p className="mt-0.5 font-bold">28–38 min</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#d9583b]">
                  <ArrowIcon />
                </span>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-6 -right-3 hidden rounded-[22px] border border-[#1f201c]/10 bg-[#f0c95f] px-5 py-4 shadow-[0_18px_40px_rgba(49,45,36,0.15)] sm:block">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#6c5414]">Status</p>
            <p className="mt-1 font-semibold">Kitchen&apos;s on it →</p>
          </div>
        </div>
      </section>

      <section id="discover" className="border-y border-[#1f201c]/10 bg-[#fff9ef]">
        <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d9583b]">
                What are you feeling?
              </p>
              <h2 className="mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl lg:text-6xl">
                Good food should be easy to find.
              </h2>
            </div>
            <p className="max-w-md text-base leading-7 text-[#6c6d65]">
              Browse by craving, not by clutter. We keep discovery simple so dinner does not
              turn into another task.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-2.5">
            {categories.map((category, index) => (
              <button
                key={category}
                className={`rounded-full border px-5 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5 ${
                  index === 0
                    ? "border-[#1f201c] bg-[#1f201c] text-[#fff9ef]"
                    : "border-[#1f201c]/15 bg-transparent text-[#3e3f3a]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {restaurants.map((restaurant) => (
              <article key={restaurant.name} className="group">
                <RestaurantArtwork
                  tone={restaurant.tone}
                  plate={restaurant.plate}
                  garnish={restaurant.garnish}
                />
                <div className="flex items-start justify-between gap-4 px-1 pt-4">
                  <div>
                    <h3 className="text-xl font-semibold tracking-[-0.035em]">
                      {restaurant.name}
                    </h3>
                    <p className="mt-1 text-sm text-[#777870]">{restaurant.detail}</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-[#efeadf] px-2.5 py-1.5 text-xs font-bold">
                    <span className="text-[#d9583b]">★</span>
                    {restaurant.rating}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
          <div className="lg:sticky lg:top-10 lg:self-start">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d9583b]">
              How OrderEats works
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
              Less admin.
              <br />
              More eating.
            </h2>
            <p className="mt-5 max-w-sm leading-7 text-[#6c6d65]">
              Search, mix, pay once, and follow each restaurant&apos;s progress from your order
              screen.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              [
                "01",
                "Pick what you actually want",
                "Choose from nearby restaurants and build your basket without jumping between apps or checkouts.",
              ],
              [
                "02",
                "Mix restaurants in one order",
                "Jollof from one place, dessert from another. OrderEats keeps the pieces organised under one customer order.",
              ],
              [
                "03",
                "Know what is happening",
                "Restaurant preparation, rider pickup, delivery and payment status stay visible instead of disappearing into a black box.",
              ],
            ].map(([number, title, copy]) => (
              <article
                key={number}
                className="grid gap-5 rounded-[30px] border border-[#1f201c]/10 bg-[#fff9ef]/60 p-6 sm:grid-cols-[72px_1fr] sm:p-8"
              >
                <span className="text-sm font-bold text-[#d9583b]">{number}</span>
                <div>
                  <h3 className="text-2xl font-semibold tracking-[-0.04em]">{title}</h3>
                  <p className="mt-3 max-w-2xl leading-7 text-[#6c6d65]">{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#20231e] text-[#fff9ef]">
        <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-20 lg:px-12 lg:py-28">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ef987f]">
              Built for real cravings
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.055em] sm:text-5xl lg:text-6xl">
              One basket.
              <br />
              Multiple kitchens.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#c3c4bc]">
              Your order can contain food from different restaurants while each kitchen still
              gets its own clean ticket, status, and delivery flow.
            </p>
          </div>

          <div className="rounded-[34px] bg-[#f4efe6] p-4 text-[#1f201c] sm:p-6">
            <div className="rounded-[26px] border border-[#1f201c]/10 bg-[#fff9ef] p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8a8b82]">
                    Order #OE-2048
                  </p>
                  <p className="mt-1 text-xl font-semibold tracking-[-0.03em]">On the way</p>
                </div>
                <span className="rounded-full bg-[#dde5d7] px-3 py-1.5 text-xs font-bold text-[#355640]">
                  Live
                </span>
              </div>

              <div className="mt-7 space-y-5">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">Jollof & Co.</span>
                    <span className="text-[#6c6d65]">Ready for pickup</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e7e1d6]">
                    <div className="h-full w-[72%] rounded-full bg-[#d9583b]" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">Char & Spice</span>
                    <span className="text-[#6c6d65]">Preparing</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e7e1d6]">
                    <div className="h-full w-[48%] rounded-full bg-[#d9b84f]" />
                  </div>
                </div>
              </div>

              <div className="mt-7 flex items-center gap-3 rounded-[20px] bg-[#20231e] p-4 text-[#fff9ef]">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#344239] text-sm font-bold">
                  AD
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#aeb0a7]">Your rider</p>
                  <p className="truncate font-semibold">Ayo is collecting your order</p>
                </div>
                <span className="text-sm font-semibold">12 min</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="overflow-hidden rounded-[36px] bg-[#d9583b] p-7 text-white sm:p-10 lg:p-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                Restaurants, come through
              </p>
              <h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl lg:text-6xl">
                Your menu deserves a cleaner way to reach people.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
                Set up your restaurant, organise categories, manage menu items and get ready
                for orders from one straightforward dashboard.
              </p>
            </div>
            <Link
              href="/restaurant/new"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-[#20231e] px-6 py-4 text-sm font-bold text-[#fff9ef] transition-transform hover:-translate-y-0.5"
            >
              Add your restaurant
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#1f201c]/10">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-7 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#1f201c] text-xs font-black text-[#fff9ef]">
              OE
            </span>
            <span className="font-semibold tracking-[-0.03em]">OrderEats</span>
          </Link>
          <p className="text-sm text-[#777870]">Good food. Less faff.</p>
          <div className="flex gap-5 text-sm font-medium text-[#55564f]">
            <a href="#discover" className="hover:text-[#1f201c]">
              Discover
            </a>
            <Link href="/restaurant/new" className="hover:text-[#1f201c]">
              Restaurants
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
