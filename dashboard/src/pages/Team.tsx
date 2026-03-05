const team = [
  { name: 'فاطمة', role: 'مسؤولة رقمية' },
  { name: 'سائق 1', role: 'سائق' },
  { name: 'فني 1', role: 'فني حدائق' },
  { name: 'فني 2', role: 'فني حدائق' },
];

export default function TeamPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold text-green-deep">الفريق</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {team.map((m) => (
          <div
            key={m.name}
            className="rounded-2xl border border-green-deep/10 bg-green-soft/30 p-6 text-center shadow-sm"
          >
            <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-green-mid" />
            <p className="font-bold text-green-deep">{m.name}</p>
            <p className="text-sm text-gray-500">{m.role}</p>
          </div>
        ))}
      </div>
    </>
  );
}
