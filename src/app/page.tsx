import Link from "next/link";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { getOrCreateCurrentUser } from "@/lib/current-user";

const categories = ["Nigerian", "Grills", "Burgers", "Healthy", "Late night", "Desserts"];
const restaurants = [
  { name: "Jollof & Co.", detail: "Nigerian · 20–30 min", rating: "4.9", shade: "bg-[#111]" },
  { name: "Char & Spice", detail: "Grills · 25–35 min", rating: "4.8", shade: "bg-[#d9d9d9]" },
  { name: "Good Bowl", detail: "Healthy · 15–25 min", rating: "4.7", shade: "bg-[#777]" },
];

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none"><path d="M5 10h9m-3.5-3.5L14 10l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PinIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="10" r="2.2" fill="currentColor" /></svg>;
}

function BagIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d="M6 8.5h12l1 11H5l1-11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M9 9V7a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

function FoodArtwork({ shade }: { shade: string }) {
  return (
    <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl ${shade}`} aria-hidden="true">
      <div className="absolute inset-[12%] border border-white/20" />
      <div className="absolute left-1/2 top-1/2 h-[58%] w-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-3 shadow-2xl">
        <div className="relative h-full w-full overflow-hidden rounded-full bg-[#ececec]">
          <div className="absolute left-[16%] top-[18%] h-[34%] w-[48%] rotate-[-12deg] rounded-full bg-[#222]" />
          <div className="absolute bottom-[15%] right-[13%] h-[42%] w-[38%] rounded-full bg-[#999]" />
          <div className="absolute bottom-[14%] left-[14%] h-[30%] w-[30%] rounded-full bg-[#555]" />
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const user = await getOrCreateCurrentUser();

  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-black">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-4 sm:h-20 sm:px-8 lg:px-12">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="OrderEats home">
            <span className="grid h-9 w-9 shrink-0 place-items-center bg-black text-xs font-black text-white sm:h-10 sm:w-10">OE</span>
            <span className="truncate text-lg font-semibold tracking-[-0.04em] sm:text-xl">OrderEats</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <a href="#discover" className="hover:opacity-50">Discover</a>
            <a href="#how-it-works" className="hover:opacity-50">How it works</a>
            <Link href="/restaurant/new" className="hover:opacity-50">For restaurants</Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            {!user ? <><SignInButton mode="modal"><button className="hidden px-4 py-2.5 text-sm font-semibold sm:block">Sign in</button></SignInButton><SignUpButton mode="modal"><button className="bg-black px-3.5 py-2.5 text-sm font-semibold text-white sm:px-5">Get started</button></SignUpButton></> : <div className="flex items-center gap-3"><span className="hidden text-sm text-black/55 sm:inline">Hi, {user.firstName || "there"}</span><UserButton /></div>}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1400px] px-4 pb-16 pt-14 text-center sm:px-8 sm:pb-24 sm:pt-20 lg:px-12 lg:pb-28 lg:pt-28">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-balance text-[clamp(3.25rem,11vw,8rem)] font-semibold leading-[0.88] tracking-[-0.075em]">Craving it?<span className="block">Order it.</span></h1>
          <p className="mx-auto mt-6 max-w-[32rem] px-1 text-[16px] leading-6 text-black/55 sm:mt-8 sm:max-w-2xl sm:text-xl sm:leading-8">Your favourite food, from the places you actually want to eat from. Mix restaurants in one order, track every part, and get back to your day.</p>

          <div className="mx-auto mt-8 w-full max-w-2xl border border-black/15 bg-white p-2 shadow-[0_12px_40px_rgba(0,0,0,0.08)] sm:mt-10 sm:flex sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left text-black/50">
              <PinIcon /><span className="min-w-0 truncate text-sm sm:text-base">Enter your delivery address</span>
            </div>
            <a href="#discover" className="flex w-full items-center justify-center gap-2 bg-black px-5 py-3.5 text-sm font-bold text-white sm:w-auto sm:py-4">Find food <ArrowIcon /></a>
          </div>
          <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-black/50 sm:text-sm">
            <span>✓ One checkout</span><span>✓ Live order status</span><span>✓ Secure payments</span>
          </div>
        </div>

        <div className="mx-auto mt-14 w-full max-w-3xl text-left sm:mt-20">
          <div className="border border-black/15 bg-[#f7f7f7] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.10)] sm:p-5">
            <div className="border border-black/10 bg-white p-4 sm:p-7">
              <div className="flex items-start justify-between gap-3">
                <h2 className="max-w-[15rem] text-xl font-semibold tracking-[-0.04em] sm:max-w-none sm:text-3xl">Three cravings. One basket.</h2>
                <div className="grid h-10 w-10 shrink-0 place-items-center border border-black/15 sm:h-12 sm:w-12"><BagIcon /></div>
              </div>
              <div className="mt-5 space-y-2.5 sm:mt-7">
                {[['Smoky party jollof','Jollof & Co.','₦4,800'],['Spiced chicken skewers','Char & Spice','₦5,200']].map(([item, place, price]) => <div key={item} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 border border-black/10 p-3 sm:grid-cols-[52px_minmax(0,1fr)_auto] sm:gap-4"><div className="h-10 w-10 bg-black sm:h-13 sm:w-13" /><div className="min-w-0"><p className="truncate text-sm font-semibold sm:text-base">{item}</p><p className="truncate text-xs text-black/45 sm:text-sm">{place}</p></div><span className="text-xs font-semibold sm:text-sm">{price}</span></div>)}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border border-black/10 bg-[#f5f5f5] p-4 text-sm"><div><p className="text-black/45">Restaurants</p><p className="mt-1 font-semibold">2 kitchens</p></div><div className="text-right"><p className="text-black/45">Total</p><p className="mt-1 text-lg font-bold">₦11,650</p></div></div>
              <div className="mt-3 flex items-center justify-between bg-black px-4 py-4 text-white sm:px-5"><div><p className="text-xs text-white/55">Arrives in</p><p className="font-bold">28–38 min</p></div><span className="grid h-9 w-9 place-items-center bg-white text-black"><ArrowIcon /></span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="discover" className="border-y border-black/10 bg-[#f7f7f7]">
        <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <h2 className="max-w-2xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl lg:text-6xl">Good food should be easy to find.</h2>
            <p className="max-w-md text-base leading-7 text-black/55">Browse by craving, not by clutter. We keep discovery simple so dinner does not turn into another task.</p>
          </div>
          <div className="mobile-scroll-row mt-8 flex gap-2.5 sm:mt-10 sm:flex-wrap">
            {categories.map((category, index) => <button key={category} className={`shrink-0 border px-5 py-3 text-sm font-semibold ${index === 0 ? 'border-black bg-black text-white' : 'border-black/15 bg-white text-black'}`}>{category}</button>)}
          </div>
          <div className="mt-8 grid gap-8 md:grid-cols-3 md:gap-5">
            {restaurants.map((restaurant) => <article key={restaurant.name}><FoodArtwork shade={restaurant.shade} /><div className="flex items-start justify-between gap-4 pt-4"><div><h3 className="text-xl font-semibold tracking-[-0.035em]">{restaurant.name}</h3><p className="mt-1 text-sm text-black/50">{restaurant.detail}</p></div><div className="border border-black/10 bg-white px-2.5 py-1.5 text-xs font-bold">★ {restaurant.rating}</div></div></article>)}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-[1400px] px-4 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
          <div className="lg:sticky lg:top-10 lg:self-start"><h2 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">Less admin.<br />More eating.</h2><p className="mt-5 max-w-sm leading-7 text-black/55">Search, mix, pay once, and follow each restaurant&apos;s progress from your order screen.</p></div>
          <div className="grid gap-3">{[["01","Pick what you actually want","Choose from nearby restaurants and build your basket without jumping between apps or checkouts."],["02","Mix restaurants in one order","Jollof from one place, dessert from another. OrderEats keeps the pieces organised under one customer order."],["03","Know what is happening","Restaurant preparation, rider pickup, delivery and payment status stay visible instead of disappearing into a black box."]].map(([number,title,copy]) => <article key={number} className="grid gap-4 border border-black/10 bg-[#fafafa] p-5 sm:grid-cols-[64px_1fr] sm:p-8"><span className="text-sm font-bold text-black/35">{number}</span><div><h3 className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl">{title}</h3><p className="mt-3 leading-7 text-black/55">{copy}</p></div></article>)}</div>
        </div>
      </section>

      <section className="bg-black text-white">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:items-center lg:gap-20 lg:px-12 lg:py-28">
          <div><h2 className="text-4xl font-semibold tracking-[-0.055em] sm:text-5xl lg:text-6xl">One basket.<br />Multiple kitchens.</h2><p className="mt-6 max-w-xl text-base leading-7 text-white/55 sm:text-lg sm:leading-8">Your order can contain food from different restaurants while each kitchen still gets its own clean ticket, status, and delivery flow.</p></div>
          <div className="border border-white/20 bg-[#111] p-3 sm:p-5"><div className="border border-white/10 bg-white p-4 text-black sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs text-black/40">Order #OE-2048</p><p className="mt-1 text-xl font-semibold">On the way</p></div><span className="border border-black/15 px-3 py-1.5 text-xs font-bold">Live</span></div><div className="mt-7 space-y-5">{[['Jollof & Co.','Ready for pickup','72%'],['Char & Spice','Preparing','48%']].map(([name,status,width]) => <div key={name}><div className="flex flex-col gap-1 text-sm min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between"><span className="font-semibold">{name}</span><span className="text-black/45">{status}</span></div><div className="mt-3 h-1.5 bg-black/10"><div className="h-full bg-black" style={{width}} /></div></div>)}</div><div className="mt-7 grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 bg-black p-3.5 text-white sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:p-4"><div className="grid h-10 w-10 place-items-center border border-white/20 text-xs font-bold sm:h-11 sm:w-11">AD</div><div className="min-w-0"><p className="text-xs text-white/45">Your rider</p><p className="truncate text-sm font-semibold sm:text-base">Ayo is collecting your order</p></div><span className="text-xs font-semibold sm:text-sm">12 min</span></div></div></div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-28"><div className="border border-black/10 bg-[#f5f5f5] p-6 sm:p-10 lg:p-14"><div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><h2 className="max-w-3xl text-4xl font-semibold tracking-[-0.055em] sm:text-5xl lg:text-6xl">Your menu deserves a cleaner way to reach people.</h2><p className="mt-5 max-w-2xl text-base leading-7 text-black/55 sm:text-lg">Set up your restaurant, organise categories, manage menu items and get ready for orders from one straightforward dashboard.</p></div><Link href="/restaurant/new" className="inline-flex w-full items-center justify-center gap-2 bg-black px-6 py-4 text-sm font-bold text-white sm:w-fit">Add your restaurant <ArrowIcon /></Link></div></div></section>

      <footer className="border-t border-black/10"><div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-10 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12"><Link href="/" className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center bg-black text-xs font-black text-white">OE</span><span className="font-semibold">OrderEats</span></Link><p className="text-sm text-black/45">Good food. Less faff.</p><div className="flex gap-5 text-sm font-medium"><a href="#discover">Discover</a><Link href="/restaurant/new">Restaurants</Link></div></div></footer>
    </main>
  );
}
