import { Link } from "react-router-dom";
import {
  ArrowRight, FileText, Sparkles, GraduationCap, Languages, Code2, BookOpenCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const HERO_IMG =
  "https://static.prod-images.emergentagent.com/jobs/325386cb-2c1a-4577-a2a1-bbe83ae8f425/images/6138e0f4b5bc1b85a6bbbd4ba62e6350ebc0b0f26392ad6e9e5273aeb7e82606.png";
const BOOK_IMG =
  "https://static.prod-images.emergentagent.com/jobs/325386cb-2c1a-4577-a2a1-bbe83ae8f425/images/feec99fbd4b4adc7d23a089d8802bd3cfa24f3537005786744d57203ed48d780.png";
const LIB_IMG =
  "https://static.prod-images.emergentagent.com/jobs/325386cb-2c1a-4577-a2a1-bbe83ae8f425/images/c5c28f5a7363bdd52c74bed7d1a7776a5e35c555e9cae963c4289d5015ffa091.png";
const STUDENTS_IMG =
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwzfHxkaXZlcnNlJTIwc3R1ZGVudHMlMjBzdHVkeWluZyUyMGxhcHRvcHxlbnwwfHx8fDE3Nzk2MzU3Nzd8MA&ixlib=rb-4.1.0&q=85";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
            <div className="w-7 h-7 bg-black flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-black text-lg tracking-tight">Qelvora School CRM<span className="text-blue-600"> AI</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-black">Features</a>
            <a href="#levels" className="hover:text-black">Levels</a>
            <a href="#how" className="hover:text-black">How it works</a>
          </div>
          <Link to="/app/paper">
            <Button data-testid="nav-launch-btn" className="rounded-sm bg-black hover:bg-black/90 text-white px-5 h-9 font-semibold tracking-wide">
              Launch App <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-16 lg:pt-24 pb-20 lg:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 fade-up">
            <div className="label mb-6" data-testid="hero-label">AI Exam Prep · Nursery → PhD · 11 Languages</div>
            <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl leading-[0.95] tracking-tighter">
              Generate exams.<br />
              <span className="text-blue-600">Ace your studies.</span>
            </h1>
            <p className="mt-7 text-lg text-slate-600 max-w-xl leading-relaxed">
              A curriculum-compliant examination paper generator for Indian boards and global curricula — from nursery
              rhymes to PhD research. Powered by GPT-5.2.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link to="/app/paper">
                <Button data-testid="hero-generate-paper-btn" className="rounded-sm bg-black hover:bg-black/90 text-white h-12 px-7 font-semibold tracking-wide">
                  Generate exam paper <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs text-slate-500">
              <div><span className="text-black font-bold">30+</span> standards</div>
              <div className="w-px h-4 bg-slate-300" />
              <div><span className="text-black font-bold">25+</span> subjects</div>
              <div className="w-px h-4 bg-slate-300" />
              <div><span className="text-black font-bold">15+</span> syllabi</div>
              <div className="w-px h-4 bg-slate-300" />
              <div><span className="text-black font-bold">11</span> languages</div>
            </div>
          </div>
          <div className="lg:col-span-5 relative grain">
            <div className="aspect-square bg-white border border-slate-200 rounded-sm overflow-hidden">
              <img src={HERO_IMG} alt="Qelvora AI illustration" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-black text-white px-5 py-3 rounded-sm hidden md:block">
              <div className="label text-white/70">Powered by</div>
              <div className="font-display font-bold">GPT-5.2 + Nano Banana</div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento features */}
      <section id="features" className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="label mb-3">Core Features</div>
            <h2 className="font-display font-black text-4xl lg:text-5xl tracking-tight">Built for every learner.</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Paper */}
          <div className="md:col-span-12 bg-black text-white rounded-sm p-8 relative overflow-hidden group">
            <div className="max-w-2xl">
              <FileText className="w-7 h-7 mb-6" strokeWidth={1.5} />
              <h3 className="font-display font-bold text-3xl tracking-tight mb-3">Question Paper Generator</h3>
              <p className="text-white/70 leading-relaxed mb-6 text-lg">
                MCQs, 2-mark, 5-mark, 10-mark, coding, viva. Generate full, curriculum-compliant exam papers and answer keys with one click. Export to clean, printable PDFs.
              </p>
              <Link to="/app/paper">
                <Button data-testid="feature-paper-btn" className="rounded-sm bg-white text-black hover:bg-white/90 font-semibold h-10 px-5">
                  Try it now <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
          {/* Multilingual */}
          <div className="md:col-span-6 bg-white border border-slate-200 rounded-sm p-8">
            <Languages className="w-7 h-7 mb-6" strokeWidth={1.5} />
            <h3 className="font-display font-bold text-xl tracking-tight mb-2">11 Languages Supported</h3>
            <p className="text-slate-600 leading-relaxed">
              Generate exams in English, Hindi, Kannada, Tamil, Telugu, Marathi, Bengali, Gujarati, Malayalam, Punjabi, or Urdu. Keep technical terms in English when appropriate.
            </p>
          </div>
          {/* Coding */}
          <div className="md:col-span-6 bg-blue-600 text-white rounded-sm p-8">
            <Code2 className="w-7 h-7 mb-6" strokeWidth={1.5} />
            <h3 className="font-display font-bold text-xl tracking-tight mb-2">Coding Sections</h3>
            <p className="text-white/80 leading-relaxed">
              Include fully-fledged programming problems with clean, commented code solutions and test cases in your generated papers.
            </p>
          </div>
        </div>
      </section>

      {/* Levels */}
      <section id="levels" className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <div className="label mb-3">Every Stage</div>
              <h2 className="font-display font-black text-4xl lg:text-5xl tracking-tight mb-6">
                Nursery to PhD.<br />Every board. Every subject.
              </h2>
              <p className="text-slate-600 leading-relaxed mb-6">
                Whether your child is learning their first alphabet or you're writing a doctoral
                thesis, Qelvora AI scales with you.
              </p>
              <img src={STUDENTS_IMG} alt="Students" className="w-full rounded-sm border border-slate-200 max-h-80 object-cover" />
            </div>
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                ["Nursery / LKG / UKG", GraduationCap],
                ["Class 1–5 Primary", BookOpenCheck],
                ["Class 6–10 Secondary", BookOpenCheck],
                ["PUC / 11–12", BookOpenCheck],
                ["ITI / Diploma", GraduationCap],
                ["NEET / JEE Prep", Sparkles],
                ["Engineering / VTU", Code2],
                ["MBBS / Law / MBA", GraduationCap],
                ["PhD / Research", Sparkles],
              ].map(([label, Icon]) => (
                <div key={label} className="p-5 border border-slate-200 hover:border-black transition-colors bg-white">
                  <Icon className="w-5 h-5 mb-3 text-slate-700" strokeWidth={1.5} />
                  <div className="font-display font-semibold text-sm">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="label mb-3">How it works</div>
        <h2 className="font-display font-black text-4xl lg:text-5xl tracking-tight mb-12">Three steps. Zero friction.</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { n: "01", t: "Pick your context", d: "Select standard, subject, syllabus, difficulty and language." },
            { n: "02", t: "Specify parameters", d: "Configure topic focus, question type counts, total marks and duration." },
            { n: "03", t: "Generate & export", d: "Instantly create a complete question paper and download it as a PDF." },
          ].map((s) => (
            <div key={s.n} className="bg-white border border-slate-200 p-8 rounded-sm">
              <div className="font-mono text-blue-600 mb-4 text-sm">{s.n}</div>
              <h3 className="font-display font-bold text-xl tracking-tight mb-2">{s.t}</h3>
              <p className="text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
        <div className="bg-black text-white rounded-sm p-12 lg:p-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-8">
            <h2 className="font-display font-black text-4xl lg:text-5xl tracking-tight">Start generating in seconds.</h2>
            <p className="text-white/70 mt-4 max-w-xl">No signup. No card. Open the app and generate curriculum-compliant question papers instantly.</p>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end">
            <Link to="/app/paper">
              <Button data-testid="cta-launch-btn" className="rounded-sm bg-white text-black hover:bg-white/90 h-12 px-8 font-bold tracking-wide">
                Launch Qelvora AI <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-slate-500">
          <div>© 2026 Qelvora AI — Education for everyone.</div>
          <div className="font-mono text-xs">v0.1 · MVP</div>
        </div>
      </footer>
    </div>
  );
}
