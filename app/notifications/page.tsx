'use client';

export default function NotificationsPage() {
  // Placeholder notifications
  const notifications = [
    { id: 1, title: "Welcome!", message: "Thanks for joining our platform." },
    { id: 2, title: "Profile Updated", message: "Your profile information was successfully updated." },
    { id: 3, title: "New Follower", message: "You have a new follower: @sketchfan123." },
    { id: 4, title: "Password Changed", message: "Your password was changed successfully." },
    { id: 5, title: "Export Complete", message: "Your 3D mint export is ready for download." },
  ];

  return (
    <div className="max-w-xl mx-auto my-24 p-8 bg-background rounded-2xl border border-[#333] shadow text-foreground">
      <h1 className="text-3xl font-bold mb-8">Notifications</h1>
      <ul className="space-y-4">
        {notifications.map((n) => (
          <li
            key={n.id}
            className="p-4 rounded-xl border border-[#222] bg-background hover:bg-background/80 transition cursor-pointer select-none"
          >
            <div className="inline-block font-semibold text-sm mr-3">{n.title}</div>
            <div className="inline-block text-[#bbb] text-sm">{n.message}</div>
          </li>
        ))}
      </ul>
      {notifications.length === 0 && (
        <div className="text-center text-[#888] py-8">No notifications yet.</div>
      )}
    </div>
  );
}