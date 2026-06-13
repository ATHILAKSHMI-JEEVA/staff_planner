import { useNavigate, Link }         from "@tanstack/react-router";
import { useForm }              from "react-hook-form";
import { zodResolver }          from "@hookform/resolvers/zod";
import { z }                    from "zod";
import { useEffect, useState }  from "react";
import { toast }                from "sonner";
import { Eye, EyeOff, Loader2, ArrowRight, ShieldCheck, Zap, Bell } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Min 6 characters"),
});
type FormData = z.infer<typeof schema>;

// Feature highlights shown on the left panel
const FEATURES = [
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Smart Leave Management",
    desc: "Apply and track leaves with automatic penalty calculations and real-time shortfall detection.",
    color: "bg-indigo-500/15 text-indigo-300",
  },
  {
    icon: <Bell className="h-5 w-5" />,
    title: "Instant Notifications",
    desc: "Parents receive immediate alerts when sessions are affected by teacher absences.",
    color: "bg-sky-500/15 text-sky-300",
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Substitute Assignment",
    desc: "Admins can quickly resolve shortfalls by assigning available substitute teachers.",
    color: "bg-violet-500/15 text-violet-300",
  },
];

export function LoginForm() {

  const { login, user }                     = useAuth();
  const navigate                            = useNavigate();
  const [submitting, setSubmitting]         = useState(false);
  const [showPw,     setShowPw]             = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (user) {
      const role = user.roles?.[0] || "teacher";
      const dest = role === "manager" ? "/manager" : `/${role}`;
      navigate({ to: dest as any, replace: true });
    }
  }, [user, navigate]);


  // Submit handler - calls login(), then navigates to the role-based route
  const onSubmit = async (values: FormData) => {
    setSubmitting(true);
    try {
      const u = await login(values.email, values.password);
      const role = u.roles?.[0] || "teacher";
      toast.success(`Welcome back, ${u.name || "friend"}!`);
      const dest = role === "manager" ? "/manager" : `/${role}`;
      navigate({ to: dest as any, replace: true });
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[44%] mesh-bg flex-col justify-between p-12 text-white relative overflow-hidden">
        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="h-10 w-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center font-black text-lg backdrop-blur-sm">
            V
          </div>
          <div>
            <p className="font-bold text-base leading-tight tracking-tight">Bright Steps</p>
            <p className="text-xs text-white/50 font-medium tracking-wide uppercase">Staff Planner</p>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white mb-3">
              Smarter staff<br />scheduling, simplified.
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-xs">
              Real-time leave management and session coordination for education centres.
            </p>
          </div>

          <div className="space-y-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-3.5 items-start p-4 rounded-xl bg-white/5 border border-white/8 backdrop-blur-sm">
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0", f.color)}>
                  {f.icon}
                </div>
                <div>
                  <p className="font-semibold text-sm text-white">{f.title}</p>
                  <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/30">© 2025 Bright Steps. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-[380px] space-y-7">

          {/* Mobile logo */}
          <div className="flex flex-col items-center lg:hidden pb-2">
            <div className="h-12 w-12 rounded-2xl mesh-bg text-white flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-500/25">V</div>
            <h1 className="mt-3 text-xl font-bold tracking-tight">Bright Steps</h1>
            <p className="text-sm text-muted-foreground">Staff Planner</p>
          </div>

          {/* Heading */}
          <div className="hidden lg:block">
            <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter your credentials to access your portal</p>
          </div>
          <div className="lg:hidden text-center">
            <h2 className="text-xl font-bold tracking-tight">Sign in to your account</h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">or continue manually</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Form */}

          {/* Login form */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...form.register("email")}
                className={cn(
                  "h-10 text-sm transition-all",
                  form.formState.errors.email ? "border-destructive focus-visible:ring-destructive/30" : ""
                )}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...form.register("password")}
                  className={cn(
                    "h-10 pr-10 text-sm transition-all",
                    form.formState.errors.password ? "border-destructive" : ""
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10 text-sm font-semibold gap-2 bg-primary hover:bg-primary-hover shadow-md shadow-indigo-500/25 transition-all"
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Signing in…</>
              ) : (
                <><span>Sign in</span><ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          {/* Footer note */}
          <p className="text-center text-[11px] text-muted-foreground/70 leading-relaxed">
            After login you will be automatically redirected to your
            portal based on your role (admin / teacher / parent / manager).
          </p>

          {/* Sign up link */}
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
