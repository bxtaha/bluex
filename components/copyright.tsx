export function Copyright() {
  const year = new Date().getFullYear();

  return (
    <p className="fixed left-4 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-base text-white">
      All Rights Reserved &copy; {year} BlueX
    </p>
  );
}
