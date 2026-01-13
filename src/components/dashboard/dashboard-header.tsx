import { Mail } from 'lucide-react';
import Link from 'next/link';
import { LogoutButton } from '@/components/auth';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface DashboardHeaderProps {
    user: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
    return (
        <header className='border-b bg-background'>
            <div className='container mx-auto flex h-16 items-center justify-between px-4'>
                <Link href='/dashboard' className='flex items-center gap-2'>
                    <Mail className='h-6 w-6' />
                    <span className='text-xl font-bold'>AI Email Sorter</span>
                </Link>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant='ghost' className='gap-2'>
                            {user.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={user.image}
                                    alt={user.name || 'User'}
                                    className='h-8 w-8 rounded-full'
                                />
                            ) : (
                                <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                                    {user.name?.charAt(0) ||
                                        user.email?.charAt(0) ||
                                        'U'}
                                </div>
                            )}
                            <span className='hidden sm:inline'>
                                {user.name || user.email}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='w-56'>
                        <DropdownMenuLabel>
                            <div className='flex flex-col'>
                                <span>{user.name}</span>
                                <span className='text-xs font-normal text-muted-foreground'>
                                    {user.email}
                                </span>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href='/dashboard'>Dashboard</Link>
                        </DropdownMenuItem>
                        {/* <DropdownMenuItem asChild>
                            <Link href='/dashboard/settings'>Settings</Link>
                        </DropdownMenuItem> */}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <LogoutButton variant='ghost' showIcon={false} />
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
