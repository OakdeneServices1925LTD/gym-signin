'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Tabs({ isAdmin }) {
  const path = usePathname();
  const on = (p) => (path === p ? 'on' : '');
  return (
    <nav className="tabs">
      <div>
        <Link href="/gym" className={on('/gym')}><b>◉</b>Gym</Link>
        <Link href="/book" className={on('/book')}><b>▦</b>Book</Link>
        {isAdmin && <Link href="/admin" className={on('/admin')}><b>☰</b>Admin</Link>}
      </div>
    </nav>
  );
}
