export default function Home() {
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Welcome to your Dashboard
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Your Next.js project is ready for development. Next step: Set up Airtable integration.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
