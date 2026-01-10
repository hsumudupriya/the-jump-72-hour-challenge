import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect('/login');
    }

    return (
        <div className='min-h-screen bg-muted/30'>
            <DashboardHeader user={session.user} />
            <main className='container mx-auto px-4 py-8'>{children}</main>
        </div>
    );
}
