import Link from "next/link";
import { SignInButton, UserButton } from "@clerk/nextjs";
import { getOrCreateCurrentUser } from "@/lib/current-user";
import { ArrowRight, MapPin, Menu, Plus, ShoppingBag } from "lucide-react";

const categories = ["Nigerian", "Grills", "Burgers", "Healthy", "Late night", "Desserts"];
const restaurants = [
  { name: "Jollof & Co.", detail: "Nigerian · 20–30 min", rating: "4.9", tone: "bg-[#d95d43]", plate: "bg-[#efc968]", garnish: "bg-[#3f654b]" },
  { name: "Char & Spice", detail: "Grills · 25–35 min", rating: "4.8", tone: "bg-[#31483a]", plate: "bg-[#d69a62]", garnish: "bg-[#b84834]" },
  { name: "Good Bowl", detail: "Healthy · 15–25 min", rating: "4.7", tone: "bg-[#d8c997]", plate: "bg-[#e8e0c8]", garnish: "bg-[#66804d]" },
];


function FoodArtwork({ tone, plate, garnish }: { tone: string; plate: string; garnish: string }) {
  return <div className={`relative aspect-[4/3] overflow-hidden rounded-[22px] ${tone}`} aria-hidden="true"><div className="absolute left-1/2 top-1/2 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-3 shadow-[0_16px_40px_rgba(0,0,0,.14)]"><div className={`relative h-full w-full overflow-hidden rounded-full ${plate}`}><div className="absolute left-[16%] top-[18%] h-[34%] w-[48%] rotate-[-12deg] rounded-full bg-[#a84530]" /><div className="absolute bottom-[15%] right-[13%] h-[42%] w-[38%] rounded-full bg-[#815033]" /><div className={`absolute bottom-[14%] left-[14%] h-[30%] w-[30%] rounded-full ${garnish}`} /></div></div></div>;
}

export default async function Home() {
  const user = await getOrCreateCurrentUser();
  return <main className="min-h-screen overflow-x-hidden bg-white text-[#111]">
    <header className="bg-white">
      <div className="mx-auto flex h-[76px] w-full items-center justify-between px-5 sm:px-8 lg:px-11">
        <div className="flex min-w-0 items-center gap-6 sm:gap-7">
          <button type="button" aria-label="Open menu" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg transition-colors hover:bg-black/[0.04]">
            <Menu className="h-[22px] w-[22px]" strokeWidth={2} />
          </button>
          <Link href="/" aria-label="Paperbag home" className="shrink-0">
            <img src="/paperbag-wordmark.svg" alt="Paperbag" className="h-[28px] w-auto sm:h-[30px]" />
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {!user ? (
            <>
              <SignInButton mode="modal">
                <button className="rounded-full border-2 border-black px-4 py-1.5 text-sm font-semibold leading-5 transition-colors hover:bg-black hover:text-white sm:px-5">
                  Log in
                </button>
              </SignInButton>
              <Link href="/restaurant/new" className="hidden items-center gap-2 rounded-full bg-black px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80 sm:inline-flex">
                Add your Business <Plus className="h-4 w-4" strokeWidth={2.25} />
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/restaurant/new" className="hidden items-center gap-2 rounded-full bg-black px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80 sm:inline-flex">
                Add your Business <Plus className="h-4 w-4" strokeWidth={2.25} />
              </Link>
              <UserButton />
            </div>
          )}
        </div>
      </div>
    </header>

    <section className="mx-auto max-w-[1400px] px-4 pb-20 pt-16 text-center sm:px-8 sm:pb-28 sm:pt-24 lg:px-12 lg:pb-32 lg:pt-32"><div className="mx-auto max-w-5xl"><h1 className="text-balance text-[clamp(3.25rem,11vw,8rem)] font-semibold leading-[.9] tracking-[-.07em]">Craving it?<span className="block">Order it.</span></h1><p className="mx-auto mt-7 max-w-[32rem] px-1 text-base leading-7 text-black/55 sm:mt-9 sm:max-w-2xl sm:text-xl sm:leading-8">Your favourite food, from the places you actually want to eat from. Mix restaurants in one order, track every part, and get back to your day.</p><div className="mx-auto mt-10 w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-2 shadow-[0_12px_36px_rgba(0,0,0,.06)] sm:mt-12 sm:flex sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left text-black/50"><MapPin className="h-5 w-5 shrink-0" strokeWidth={1.8} /><span className="truncate text-sm sm:text-base">Enter your delivery address</span></div><a href="#discover" className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-5 py-3.5 text-sm font-bold text-white sm:w-auto sm:py-4">Find food <ArrowRight className="h-4 w-4" strokeWidth={1.9} /></a></div><div className="mx-auto mt-7 flex max-w-xl flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-black/45 sm:text-sm"><span>✓ One checkout</span><span>✓ Live order status</span><span>✓ Secure payments</span></div></div>

      <div className="mx-auto mt-16 w-full max-w-3xl text-left sm:mt-24"><div className="rounded-[24px] border border-black/[0.08] bg-white p-5 shadow-[0_22px_65px_rgba(0,0,0,.08)] sm:p-8"><div className="flex items-start justify-between gap-4"><h2 className="max-w-[16rem] text-xl font-semibold tracking-[-.04em] sm:max-w-none sm:text-3xl">Three cravings. One basket.</h2><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f5f5f5] sm:h-12 sm:w-12"><ShoppingBag className="h-5 w-5" strokeWidth={1.8} /></div></div><div className="mt-7 space-y-1">{[["Smoky party jollof","Jollof & Co.","₦4,800","bg-[#d95d43]"],["Spiced chicken skewers","Char & Spice","₦5,200","bg-[#3f654b]"]].map(([item,place,price,color]) => <div key={item} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-1 py-3 sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:gap-4"><div className={`grid h-11 w-11 place-items-center rounded-xl ${color} sm:h-13 sm:w-13`}><div className="h-6 w-6 rounded-full bg-[#efc968] ring-4 ring-white/90" /></div><div className="min-w-0"><p className="truncate text-sm font-semibold sm:text-base">{item}</p><p className="truncate text-xs text-black/45 sm:text-sm">{place}</p></div><span className="text-xs font-semibold sm:text-sm">{price}</span></div>)}</div><div className="mt-5 flex items-end justify-between border-t border-black/[0.07] pt-5"><div><p className="text-xs text-black/45">2 restaurants</p><p className="mt-1 text-sm font-medium">One checkout</p></div><div className="text-right"><p className="text-xs text-black/45">Total</p><p className="mt-1 text-xl font-bold">₦11,650</p></div></div><div className="mt-5 flex items-center justify-between rounded-xl bg-black px-5 py-4 text-white"><div><p className="text-xs text-white/55">Arrives in</p><p className="font-bold">28–38 min</p></div><span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-black"><ArrowRight className="h-4 w-4" strokeWidth={1.9} /></span></div></div></div>
    </section>

    <section id="discover" className="border-y border-black/[0.06] bg-[#fafafa]"><div className="mx-auto max-w-[1400px] px-4 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><h2 className="max-w-2xl text-4xl font-semibold tracking-[-.055em] sm:text-5xl lg:text-6xl">Good food should be easy to find.</h2><p className="max-w-md text-base leading-7 text-black/55">Browse by craving, not by clutter. We keep discovery simple so dinner does not turn into another task.</p></div><div className="mobile-scroll-row mt-10 flex gap-2.5 sm:mt-12 sm:flex-wrap">{categories.map((category,index) => <button key={category} className={`shrink-0 rounded-xl border px-5 py-3 text-sm font-semibold ${index===0?"border-black bg-black text-white":"border-black/10 bg-white"}`}>{category}</button>)}</div><div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-6">{restaurants.map(r => <article key={r.name}><FoodArtwork tone={r.tone} plate={r.plate} garnish={r.garnish} /><div className="flex items-start justify-between gap-4 pt-5"><div><h3 className="text-xl font-semibold tracking-[-.035em]">{r.name}</h3><p className="mt-1 text-sm text-black/50">{r.detail}</p></div><div className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold shadow-[0_1px_5px_rgba(0,0,0,.06)]">★ {r.rating}</div></div></article>)}</div></div></section>

    <section id="how-it-works" className="mx-auto max-w-[1400px] px-4 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32"><div className="grid gap-12 lg:grid-cols-[.78fr_1.22fr] lg:gap-20"><div className="lg:sticky lg:top-10 lg:self-start"><h2 className="text-4xl font-semibold tracking-[-.055em] sm:text-5xl">Less admin.<br />More eating.</h2><p className="mt-6 max-w-sm leading-7 text-black/55">Search, mix, pay once, and follow each restaurant&apos;s progress from your order screen.</p></div><div className="grid gap-4">{[["01","Pick what you actually want","Choose from nearby restaurants and build your basket without jumping between apps or checkouts."],["02","Mix restaurants in one order","Jollof from one place, dessert from another. Paperbag keeps the pieces organised under one customer order."],["03","Know what is happening","Restaurant preparation, rider pickup, delivery and payment status stay visible instead of disappearing into a black box."]].map(([number,title,copy]) => <article key={number} className="grid gap-5 rounded-2xl border border-black/[0.07] bg-[#fcfcfc] p-6 sm:grid-cols-[64px_1fr] sm:p-9"><span className="text-sm font-bold text-black/30">{number}</span><div><h3 className="text-xl font-semibold tracking-[-.04em] sm:text-2xl">{title}</h3><p className="mt-3 leading-7 text-black/55">{copy}</p></div></article>)}</div></div></section>

    <section className="bg-[#111] text-white"><div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-20 sm:px-8 sm:py-28 lg:grid-cols-2 lg:items-center lg:gap-20 lg:px-12 lg:py-32"><div><h2 className="text-4xl font-semibold tracking-[-.055em] sm:text-5xl lg:text-6xl">One basket.<br />Multiple kitchens.</h2><p className="mt-6 max-w-xl text-base leading-7 text-white/55 sm:text-lg sm:leading-8">Your order can contain food from different restaurants while each kitchen still gets its own clean ticket, status, and delivery flow.</p></div><div className="rounded-[24px] bg-white p-6 text-black shadow-[0_20px_60px_rgba(0,0,0,.2)] sm:p-8"><div className="flex items-center justify-between gap-3"><div><p className="text-xs text-black/40">Order #PB-2048</p><p className="mt-1 text-xl font-semibold">On the way</p></div><span className="rounded-lg bg-[#f3f3f3] px-3 py-1.5 text-xs font-bold">Live</span></div><div className="mt-8 space-y-6">{[["Jollof & Co.","Ready for pickup","72%"],["Char & Spice","Preparing","48%"]].map(([name,status,width]) => <div key={name}><div className="flex flex-col gap-1 text-sm min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between"><span className="font-semibold">{name}</span><span className="text-black/45">{status}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-black" style={{width}} /></div></div>)}</div><div className="mt-8 grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-[#f6f6f6] p-4 sm:grid-cols-[44px_minmax(0,1fr)_auto]"><div className="grid h-10 w-10 place-items-center rounded-lg bg-black text-xs font-bold text-white sm:h-11 sm:w-11">AD</div><div className="min-w-0"><p className="text-xs text-black/45">Your rider</p><p className="truncate text-sm font-semibold sm:text-base">Ayo is collecting your order</p></div><span className="text-xs font-semibold sm:text-sm">12 min</span></div></div></div></section>

    <section className="mx-auto max-w-[1400px] px-4 py-20 sm:px-8 sm:py-28 lg:px-12 lg:py-32"><div className="rounded-[24px] bg-[#f6f6f6] p-7 sm:p-11 lg:p-14"><div className="grid gap-9 lg:grid-cols-[1fr_auto] lg:items-end"><div><h2 className="max-w-3xl text-4xl font-semibold tracking-[-.055em] sm:text-5xl lg:text-6xl">Your menu deserves a cleaner way to reach people.</h2><p className="mt-6 max-w-2xl leading-7 text-black/55 sm:text-lg">Set up your restaurant, organise categories, manage menu items and get ready for orders from one straightforward dashboard.</p></div><Link href="/restaurant/new" className="inline-flex w-fit items-center gap-2 rounded-xl bg-black px-6 py-4 text-sm font-bold text-white">Add your restaurant <ArrowRight className="h-4 w-4" strokeWidth={1.9} /></Link></div></div></section>

    <footer className="border-t border-black/[0.07]"><div className="mx-auto flex max-w-[1400px] flex-col gap-7 px-4 py-12 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12"><Link href="/" className="font-semibold">Paperbag</Link><p className="text-sm text-black/45">Good food. Less faff.</p><div className="flex gap-5 text-sm font-medium text-black/60"><a href="#discover">Discover</a><Link href="/restaurant/new">Restaurants</Link></div></div></footer>
  </main>;
}