export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Hero Section */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            AI-native financial intelligence
          </div>

          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
            Upload your financial mess.
            <br />
            <span className="text-zinc-400 dark:text-zinc-500">
              Instantly understand your business.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            CountFlow uses AI to structure your raw financial data, surface
            risks, and give you clarity — no accounting degree required.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
              Get started free
            </button>
            <button className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-200 px-6 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
              See how it works
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-zinc-200 bg-zinc-50/50 px-6 py-20 dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            How it works
          </h2>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <FeatureCard
              step="1"
              title="Upload anything"
              description="CSVs, bank exports, invoices, receipts — drop your messy financial data and let AI handle the rest."
            />
            <FeatureCard
              step="2"
              title="AI structures it"
              description="Transactions are extracted, categorized, and normalized automatically with high confidence."
            />
            <FeatureCard
              step="3"
              title="Get clarity"
              description="See your cash flow, risks, and trends. Ask questions in plain English. Make better decisions."
            />
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Built for operators, not accountants
          </h2>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            No bookkeeping jargon. No ERP complexity. Just the financial
            intelligence you need to run your business.
          </p>
          <button className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200">
            Start uploading
          </button>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
        {step}
      </div>
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
    </div>
  );
}
