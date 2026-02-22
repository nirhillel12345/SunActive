export default function AccessDenied() {
    return (<div className="max-w-3xl mx-auto text-center p-8">
      <h1 className="text-2xl font-bold mb-4">Access denied</h1>
      <p className="mb-4">You don't have permission to view this page.</p>
      <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded">Go to home</a>
    </div>);
}
