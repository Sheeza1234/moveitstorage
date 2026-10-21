import { useEffect, useState } from "react";
import BookingForm from "./components/BookingForm.jsx";
import Done from "./components/Done.jsx";
import { CtaBand, Faq, Footer, Header, Hero, How, Services, Sizes, Why } from "./components/Sections.jsx";

export default function App() {
  const [unitId, setUnitId] = useState("small");
  const [result, setResult] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, [result]);

  return (
    <>
      <Header />
      <Hero />
      <main className="wrap">
        {result ? <Done result={result} onAgain={() => setResult(null)} /> : <BookingForm unitId={unitId} setUnitId={setUnitId} onDone={setResult} />}
      </main>
      <Why />
      <How />
      <Sizes onPick={setUnitId} />
      <Services />
      <Faq />
      <CtaBand />
      <Footer />
    </>
  );
}
