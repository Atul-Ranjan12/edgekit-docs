import { NavTree } from "@/components/NavTree";
import { Toc } from "@/components/Toc";
import { PrevNext } from "@/components/PrevNext";
import { TUTORIAL_NAV } from "@/lib/nav";

export default function TutorialsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[90rem] px-4 sm:px-6">
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[15rem_minmax(0,1fr)_14rem] xl:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto py-8 pr-2">
            <NavTree sections={TUTORIAL_NAV} />
          </div>
        </aside>

        <main className="min-w-0 py-8 lg:py-10">
          <article className="fade-up mx-auto max-w-3xl">{children}</article>
          <div className="mx-auto max-w-3xl">
            <PrevNext />
          </div>
        </main>

        <aside className="hidden xl:block">
          <div className="py-10">
            <Toc />
          </div>
        </aside>
      </div>
    </div>
  );
}
