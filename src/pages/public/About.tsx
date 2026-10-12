import { ButtonLink } from '@/components/ui/Button';

export default function About() {
  return (
    <div className="container-x py-16 lg:py-24">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="eyebrow">About</p>
          <h1 className="display mt-3 text-[44px] leading-[1.06] sm:text-[56px]">From your first paycheck to your future wealth.</h1>
          <div className="mt-8 space-y-5 text-[16px] leading-relaxed text-charcoal/85">
            <p>
              Most young earners in India get their first salary with little guidance on what to do with it. Advice is either generic ("save 20%") or product-led ("buy this fund"). Neither connects today’s paycheck to the life someone actually wants in ten or twenty years.
            </p>
            <p>
              Earn to Equity is built around that connection. Your current position, your goals and the long-term consequences of your decisions live in one model, so you can see how a promotion, a home, a career break or a market fall changes the picture.
            </p>
            <p>The defining feature is not the number of dashboards or the presence of AI. It is helping you answer one practical question: where do I stand today, what am I working towards, and what could I change to get there?</p>
          </div>
        </div>
        <aside className="lg:col-span-4 lg:col-start-9">
          <div className="border-t border-line pt-6">
            <p className="eyebrow">Project team</p>
            <ul className="mt-4 space-y-3 text-lg text-evergreen">
              <li>Atulya Singh</li>
              <li>Avash Srivastava</li>
              <li>Aayushi Paul</li>
              <li>Agustyae Gupta</li>
            </ul>
          </div>
          <ButtonLink to="/start" className="mt-10">
            Build My Wealth Plan
          </ButtonLink>
        </aside>
      </div>
    </div>
  );
}
