'use client';

export default function ErrorMessage({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div className="p-4 bg-red-100 text-red-700 text-center">
      {message}
      <button onClick={onDismiss} className="ml-2 text-blue-500 hover:underline">
        Dismiss
      </button>
    </div>
  );
}