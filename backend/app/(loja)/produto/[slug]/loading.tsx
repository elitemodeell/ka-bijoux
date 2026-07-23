export default function ProductLoading() {
  return (
    <div
      className="min-h-screen bg-gray-50 px-4 pb-24 pt-[120px] md:pt-[90px]"
      role="status"
      aria-label="Carregando produto"
    >
      <span className="sr-only">Carregando produto</span>
      <div className="mx-auto grid max-w-7xl animate-pulse gap-6 lg:grid-cols-[minmax(0,1fr)_480px] lg:gap-12">
        <div>
          <div className="aspect-[4/5] max-h-[680px] rounded-[32px] bg-pink-100/70 sm:aspect-square lg:aspect-[4/5]" />
          <div className="mt-3 flex gap-3">
            <div className="h-16 w-16 rounded-2xl bg-pink-100/80" />
            <div className="h-16 w-16 rounded-2xl bg-pink-100/60" />
          </div>
        </div>
        <div className="min-w-0 rounded-[30px] border border-pink-100 bg-white p-5 sm:p-6">
          <div className="h-5 w-24 rounded-full bg-pink-100" />
          <div className="mt-5 h-8 w-4/5 rounded-xl bg-gray-200" />
          <div className="mt-3 h-8 w-3/5 rounded-xl bg-gray-200/80" />
          <div className="mt-8 h-24 rounded-[24px] bg-pink-50" />
          <div className="mt-5 h-28 rounded-[24px] border border-pink-100 bg-white" />
        </div>
      </div>
    </div>
  );
}
