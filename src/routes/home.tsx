import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ArrowRight, ShieldCheck, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingIcons } from "@/components/shared/FloatingIcons";
import { categories, testimonials } from "@/data/site";

const features = [
  "Instant Credibility",
  "Targeted Audience",
  "Save Time & Effort",
  "Strategic Expansion",
  "Secure Transactions",
];

const stats = [
  { icon: ShieldCheck, label: "Verified Accounts", value: "10K+" },
  { icon: Users, label: "Happy Customers", value: "5K+" },
  { icon: Zap, label: "Instant Delivery", value: "24/7" },
];

export default function HomePage() {
  return (
    <>
      <section className="relative w-full bg-gradient-to-b from-brand-cream to-background py-16 md:py-24 overflow-hidden">
        <FloatingIcons />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-4 py-1.5 text-xs font-medium text-brand-orange uppercase tracking-wider"
            >
              Trusted marketplace since 2023
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-5 text-4xl md:text-5xl lg:text-6xl font-bold text-brand-navy leading-[1.1] tracking-tight"
            >
              Buying social media accounts,{" "}
              <span className="text-brand-orange">made easy.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-muted-foreground text-base md:text-lg leading-relaxed max-w-3xl mx-auto"
            >
              Browse a wide range of verified Instagram, Facebook, Twitter and
              YouTube accounts. Every listing is authenticated for peace of mind.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2"
            >
              {categories.slice(0, 5).map((category, idx) => (
                <span key={category.id} className="flex items-center text-sm">
                  <Link to={`/products?cat=${category.slug}`} className="text-muted-foreground hover:text-brand-orange transition-colors">
                    {category.name}
                  </Link>
                  {idx < 4 && <span className="text-border ml-5">|</span>}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Button
                asChild
                size="lg"
                className="bg-brand-orange hover:bg-brand-orange-hover text-white px-8 h-12 text-base font-semibold shadow-lg shadow-brand-orange/20"
              >
                <Link to="/products">Explore Products</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-brand-orange/30 text-brand-orange hover:bg-brand-orange hover:text-white px-8 h-12 text-base font-semibold"
              >
                <Link to="/contact">Contact Us</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="w-full bg-background border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4 justify-center">
                <div className="w-12 h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-brand-orange" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-brand-navy">{value}</div>
                  <div className="text-sm text-muted-foreground">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full bg-background py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img src="/images/about-promo.jpg" alt="Sammy Store Logs" className="w-full h-auto object-cover" />
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-brand-orange/15 rounded-full -z-10" />
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-brand-navy/10 rounded-full -z-10" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-0.5 bg-brand-orange" />
                <span className="text-brand-orange font-medium uppercase tracking-wider text-sm">About Us</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-brand-navy leading-tight tracking-tight">
                Unlock the power of an established social media presence.
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Building a strong following from scratch takes years. Sammy Store
                Logs gives you a secure, seamless way to acquire verified
                accounts and skip straight to the growth.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <span className="text-foreground text-sm font-medium">{feature}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <Button asChild variant="link" className="text-brand-orange hover:text-brand-orange-hover p-0 h-auto font-semibold">
                  <Link to="/about" className="inline-flex items-center gap-2">
                    Learn more about us <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="w-full bg-muted/40 py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-4 mb-3">
              <div className="w-10 h-0.5 bg-brand-orange" />
              <span className="text-brand-orange font-medium uppercase tracking-wider text-sm">Testimonials</span>
              <div className="w-10 h-0.5 bg-brand-orange" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-brand-navy tracking-tight">
              Trusted by thousands of users
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {testimonials.map((t, index) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-border"
              >
                <div className="text-brand-orange text-3xl leading-none mb-3">"</div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">{t.content}</p>
                <div className="flex items-center gap-3 pt-4 border-t border-border">
                  <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <h4 className="font-semibold text-brand-navy">{t.name}</h4>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
