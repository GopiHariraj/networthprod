export default function DashboardLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6 animate-pulse">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Skeleton */}
                <div className="flex justify-between items-center mb-8">
                    <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg w-64"></div>
                    <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-full w-40"></div>
                </div>

                {/* Net Worth Card Skeleton */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-2xl h-64"></div>

                {/* Stats Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg h-32"></div>
                    ))}
                </div>

                {/* Charts Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 h-96"></div>
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 h-96"></div>
                </div>
            </div>
        </div>
    );
}
