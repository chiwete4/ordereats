import {
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

import { getOrCreateCurrentUser } from "@/lib/current-user";

export default async function Home() {
  const user = await getOrCreateCurrentUser();

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">OrderEats</h1>

        {!user ? (
          <div className="flex gap-4 justify-center">
            <SignInButton />
            <SignUpButton />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p>
              Welcome, {user.firstName || "OrderEats user"}.
            </p>

            <p className="text-sm text-gray-500">
              Your OrderEats account is connected.
            </p>

            <UserButton />
          </div>
        )}
      </div>
    </main>
  );
}