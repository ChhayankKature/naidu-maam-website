// ─────────────────────────────────────────────────────────────
//  LANDING PAGE SETTINGS — everything you can customize lives here.
//  Text marked SAMPLE is placeholder content: replace it with the real details.
//  This is a personal site for a teacher; other people upload projects that
//  are shown on the separate Projects page.
//  Colors and fonts live in landing.css (the :root block at the top).
// ─────────────────────────────────────────────────────────────
const site = {
  // ── Theme (white / black) ───────────────────────────────────
  theme: {
    default: "dark",        // "dark" or "light". Used on a visitor's first visit.
    allowToggle: true,      // show the dark/light switch in the header
    storageKey: "nc-theme"  // where the visitor's choice is remembered
    // NOTE: also change DEFAULT_THEME in landing.html if you change `default`,
    // so the page never flashes the wrong color while loading.
  },

  // ── Header and navigation ───────────────────────────────────
  brand: "DR. ANITA SHARMA", // SAMPLE: text at the left of the header
  nav: [
    // label: text shown. href: "#id" scrolls this page, "file.html" opens another page.
    { label: "About", href: "#about" },
    { label: "Projects", href: "projects.html" }, // separate page, built later
    { label: "Contact", href: "#contact" }
  ],

  // ── Hero ────────────────────────────────────────────────────
  hero: {
    eyebrow: "DEPARTMENT OF COMPUTER SCIENCE",                    // SAMPLE
    headline: "DR. ANITA SHARMA",                                // SAMPLE
    tagline: "Teacher, mentor and guide. Explore the projects built by my students.", // SAMPLE
    primaryButton: { label: "Browse projects", href: "projects.html" },
    secondaryButton: { label: "Get in touch", href: "#contact" },
    // small label/value pairs under the buttons. Delete the array items to hide them.
    meta: [
      { label: "Teaches", value: "Data Structures, Algorithms" }, // SAMPLE
      { label: "Department", value: "Computer Science" },       // SAMPLE
      { label: "Office hours", value: "Mon–Fri, 10:00–12:00" }    // SAMPLE
    ]
  },

  // ── About ───────────────────────────────────────────────────
  about: {
    show: true,                    // false removes the section
    id: "about",
    label: "ABOUT",
    heading: "About me",                                          // SAMPLE
    paragraphs: [                                                // SAMPLE
      "I have taught computer science for over a decade. I enjoy helping students turn what they learn in class into projects they are proud to show.",
      "This site collects the projects my students build, so their work can be seen, shared and built on."
    ],
    facts: [                                                     // SAMPLE
      { label: "Institution", value: "Your University Name" },
      { label: "Department", value: "Computer Science and Engineering" },
      { label: "Qualification", value: "Ph.D., Computer Science" },
      { label: "Experience", value: "10+ years of teaching" }
    ],
    skills: ["Data Structures", "Algorithms", "Databases", "Web Development", "Machine Learning"] // SAMPLE: subjects and areas
  },

  // ── Contact ─────────────────────────────────────────────────
  contact: {
    show: true,
    id: "contact",
    label: "CONTACT",
    heading: "Let's talk",                                       // SAMPLE
    intro: "Questions about a course, a project or a collaboration? Send a message and I will reply.", // SAMPLE
    email: "teacher@example.com",                                // SAMPLE: her real address
    socials: [                                                   // SAMPLE: her real links; delete items not used
      { label: "GitHub", href: "https://github.com/" },
      { label: "LinkedIn", href: "https://www.linkedin.com/" }
    ],
    // Where the form sends messages.
    //  ""  → opens the visitor's email app addressed to `email` (no server needed).
    //  "https://..." → sends the form as JSON with POST (Formspree, Getform, your own API).
    formEndpoint: "",
    emailSubject: "Message from the website",
    form: {
      nameLabel: "Name",
      emailLabel: "Email",
      messageLabel: "Message",
      submitLabel: "Send message",
      successText: "Thanks, your message was sent.",
      errorText: "Something went wrong. Please email me directly."
    }
  },

  // ── Footer ──────────────────────────────────────────────────
  footer: {
    text: "© Dr. Anita Sharma. Built with Vite, React and three.js.", // SAMPLE
    showBackToTop: true
  }
};

export default site;
