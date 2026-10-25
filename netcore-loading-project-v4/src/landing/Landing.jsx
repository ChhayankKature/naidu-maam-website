import site from "./site.config.js";
import Background from "./Background.jsx";
import Header from "./Header.jsx";
import Hero from "./Hero.jsx";
import About from "./About.jsx";
import Contact from "./Contact.jsx";

// One page, three sections: Hero, About, Contact.
// Projects lives on its own page; the nav links to it (see site.config.js).
export default function Landing() {
  return (
    <>
      <Background />
      <Header />
      <main>
        <Hero />
        <About />
        <Contact />
      </main>
      <footer className="footer">
        <div className="wrap footer-inner">
          <span>{site.footer.text}</span>
          {site.footer.showBackToTop && <a href="#hero">Back to top</a>}
        </div>
      </footer>
    </>
  );
}
