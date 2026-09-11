import SignInForm from '@/components/SignInForm';

export const dynamic = 'force-dynamic';

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;
  return (
    <>
      {params?.inactive && (
        <div className="card"><p className="empty-note">
          That account is not active. Speak to an admin.
        </p></div>
      )}
      <SignInForm />
    </>
  );
}
