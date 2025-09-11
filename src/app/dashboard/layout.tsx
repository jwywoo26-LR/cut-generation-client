export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            AI Image Generation Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Generate and manage AI images with Airtable integration
          </p>
        </header>
        
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}