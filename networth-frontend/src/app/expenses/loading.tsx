export default function ExpensesLoading() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 animate-pulse">
            <div className="max-w-7xl mx-auto">
                {/* Header Skeleton */}
                <div className="mb-10 flex justify-between">
                    <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg w-64"></div>
                    <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-2xl w-96"></div>
                </div>

                {/* Stats Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-xl h-40"></div>
                    ))}
                </div>

                {/* Content Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-8">
                        <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 h-96"></div>
                        <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 h-96"></div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-[3.5rem] h-[1000px]"></div>
                </div>
            </div>
        </div>
    );
}
