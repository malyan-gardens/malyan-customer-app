const projects = [
  { id: '1', name: 'حديقة برج المطار', client: 'أحمد محمد', type: 'صيانة', status: 'جاري', progress: 60 },
  { id: '2', name: 'لاندسكيب النخبة', client: 'شركة النخبة', type: 'لاندسكيب', status: 'تخطيط', progress: 20 },
  { id: '3', name: 'فيلا فاطمة علي', client: 'فاطمة علي', type: 'نباتات صناعية', status: 'مكتمل', progress: 100 },
];

const statusClass: Record<string, string> = {
  تخطيط: 'bg-blue-100 text-blue-800',
  جاري: 'bg-green-soft text-green-mid',
  مكتمل: 'bg-emerald-100 text-emerald-800',
};

export default function ProjectsPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-extrabold text-green-deep">المشاريع</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-green-deep/10 bg-white p-6 shadow-sm"
          >
            <h3 className="font-bold text-green-deep">{p.name}</h3>
            <p className="mt-1 text-sm text-gray-500">{p.client}</p>
            <p className="mt-1 text-sm text-gray-600">{p.type}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass[p.status] ?? 'bg-gray-100'}`}>
                {p.status}
              </span>
              <span className="text-sm text-gray-500">{p.progress}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-green-soft">
              <div
                className="h-2 rounded-full bg-green-mid"
                style={{ width: `${p.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
