import { Route, Routes, useLocation } from "react-router";
import ScrollToHash from "./components/ScrollToHash";
import Header from "./sections/Header";
import Footer from "./sections/Footer";
import Home from "./pages/Home";
import UeberUns from "./pages/UeberUns";
import Kontakt from "./pages/Kontakt";
import ProjektStarten from "./pages/ProjektStarten";
import Projekte from "./pages/Projekte";
import Design from "./pages/Design";
import Systems from "./pages/Systems";
import Consulting from "./pages/Consulting";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";
import Admin from "./admin/pages/Admin";
import NotFound from "./pages/NotFound";

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <>
      {!isAdmin && (
        <>
          <a className="skip-link" href="#main">
            Zum Inhalt springen
          </a>
          <ScrollToHash />
          <Header />
        </>
      )}
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/ueber-uns" element={<UeberUns />} />
          <Route path="/kontakt" element={<Kontakt />} />
          <Route path="/projekt-starten" element={<ProjektStarten />} />
          <Route path="/projekte" element={<Projekte />} />
          <Route path="/design" element={<Design />} />
          <Route path="/systems" element={<Systems />} />
          <Route path="/consulting" element={<Consulting />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isAdmin && <Footer />}
    </>
  );
}
