import { createRestaurant } from "@/actions/restaurant";

export default function NewRestaurantPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create your restaurant</h1>
          <p className="mt-2 text-gray-600">
            Add your restaurant to OrderEats.
          </p>
        </div>

        <form action={createRestaurant} className="space-y-4">
          <div>
            <label htmlFor="name" className="block font-medium">
              Restaurant name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              required
              className="mt-1 w-full rounded-md border p-3"
              placeholder="Mama's Kitchen"
            />
          </div>

          <div>
            <label htmlFor="description" className="block font-medium">
              Description
            </label>

            <textarea
              id="description"
              name="description"
              className="mt-1 w-full rounded-md border p-3"
              placeholder="Tell customers about your restaurant"
            />
          </div>

          <div>
            <label htmlFor="phoneNumber" className="block font-medium">
              Phone number
            </label>

            <input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              className="mt-1 w-full rounded-md border p-3"
            />
          </div>

          <div>
            <label htmlFor="address" className="block font-medium">
              Campus location
            </label>

            <input
              id="address"
              name="address"
              type="text"
              className="mt-1 w-full rounded-md border p-3"
              placeholder="Baze University campus"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-black p-3 font-medium text-white"
          >
            Create restaurant
          </button>
        </form>
      </div>
    </main>
  );
}