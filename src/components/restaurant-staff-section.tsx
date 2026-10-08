import { addRestaurantStaff, toggleRestaurantStaffActive } from "@/actions/staff";
import { prisma } from "@/lib/prisma";
import { StaffUserSearch } from "@/components/staff-user-search";

const actionButton = "rounded-lg border px-3 py-2 text-sm font-medium";

export async function RestaurantStaffSection({ restaurantId, currentUserId }: { restaurantId: string; currentUserId: string }) {
  const memberships = await prisma.restaurantStaff.findMany({
    where: { restaurantId },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  const riders = memberships.filter(member => member.role === "RIDER");

  const MemberRow = ({ member, riderView = false }: { member: (typeof memberships)[number]; riderView?: boolean }) => <div className="flex flex-col gap-3 border-t py-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between">
    <div><p className="font-medium">{member.user.firstName} {member.user.lastName}{member.userId === currentUserId ? <span className="ml-2 text-xs font-normal text-gray-400">You</span> : null}</p><p className="text-sm text-gray-500">{member.user.email}</p></div>
    <div className="flex items-center gap-3"><span className="font-mono text-[10px] font-semibold tracking-wide text-gray-500">{riderView ? "RIDER" : member.role}</span><span className={`rounded-full px-2 py-1 text-xs font-medium ${member.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{member.isActive ? "Active" : "Inactive"}</span><form action={toggleRestaurantStaffActive}><input type="hidden" name="restaurantId" value={restaurantId}/><input type="hidden" name="membershipId" value={member.id}/><button className={actionButton} disabled={member.userId === currentUserId && member.isActive}>{member.isActive ? "Deactivate" : "Activate"}</button></form></div>
  </div>;

  return <>
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Staff</h2><p className="mt-1 text-sm text-gray-500">Add existing OrderEats users and manage who can work with this restaurant.</p>
      <form action={addRestaurantStaff} className="mt-5 grid gap-4 rounded-lg border bg-gray-50 p-4 md:grid-cols-[1fr_150px_auto] md:items-end"><input type="hidden" name="restaurantId" value={restaurantId}/><StaffUserSearch restaurantId={restaurantId}/><label className="text-sm font-medium">Role<select name="role" className="mt-2 w-full rounded-lg border bg-white px-3 py-2"><option value="STAFF">Staff</option><option value="RIDER">Rider</option></select></label><button className="rounded-lg bg-black px-4 py-2 font-medium text-white">Add person</button></form>
      <div className="mt-5">{memberships.map(member => <MemberRow key={member.id} member={member}/>)}</div>
    </section>

    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold">Riders</h2><p className="mt-1 text-sm text-gray-500">Active riders here will later be available for delivery assignment.</p>
      <div className="mt-5">{riders.length ? riders.map(member => <MemberRow key={member.id} member={member} riderView/>) : <p className="text-sm text-gray-500">No riders attached to this restaurant yet. Add one from the Staff section above.</p>}</div>
    </section>
  </>;
}
