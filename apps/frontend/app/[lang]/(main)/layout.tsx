import { ThemeSwitcher } from "@/components/theme-switcher";

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <>
      <header className="fixed top-0 right-0 z-50 p-4">
        <ThemeSwitcher />
      </header>
      <main className="pt-16 md:pt-20 lg:pt-24">{children}</main>
    </>
  );
};

export default MainLayout;
