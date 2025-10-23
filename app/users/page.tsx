
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

// Example: fetch users from Supabase (adjust as needed)
async function fetchUsers() {
  const res = await fetch("/api/users");
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

type User = {
  address: string;
  // add other user properties if needed
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center mt-10">Loading users...</div>;
  if (error) return <div className="text-center mt-10 text-red-500">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto py-10 mt-16">
      <h1 className="text-2xl font-bold mb-6">Registered Users</h1>
      <ul className="space-y-3">
        {users.length === 0 && <li>No users found.</li>}
        {users.map((user) => (
          <li key={user.address}>
            <Link href={`/${user.address}`} className="text-blue-500 hover:underline">
              {user.address}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
