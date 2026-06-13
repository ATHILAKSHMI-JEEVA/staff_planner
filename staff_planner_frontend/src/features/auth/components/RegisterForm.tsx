// src/features/auth/components/RegisterForm.tsx
// Sign-up form with role selection — creates a new account via POST /api/auth/register/

import { useNavigate, Link }         from "@tanstack/react-router";
import { useForm, Controller }        from "react-hook-form";
import { zodResolver }                from "@hookform/resolvers/zod";
import { z }                          from "zod";
import { useState }                   from "react";
import { toast }                      from "sonner";
import {
  Eye, EyeOff, Loader2, ArrowRight,
  UserCheck, Users, ShieldCheck, Briefcase,
  User,
} from "lucide-react";

import { useAuth }      from "../hooks/useAuth";
import apiClient        from "@/api/axiosClient";
import { Button }       from "@/components/ui/button";
import { Input }        from "@/components/ui/input";
import { Label }        from "@/components/ui/label";
import { cn }           from "@/lib/utils";

// ── Validation schema ────────────────────────────────────────────────────────
const schema = z
  .object({
    name:            z.string().min(2, "Name must be at least 2 characters"),
    email:           z.string().email("Enter a valid email address"),
    phone:           z.string().optional(),
    role:            z.enum(["teacher", "parent", "manager", "admin"], {
                       required_error: "Please select a role",
                     }),
    password:        z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path:    ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

// ── Role options ─────────────────────────────────────────────────────────────
const ROLES = [
  {
    value:  "teacher" as const,
    label:  "Teacher",
    desc:   "Conduct sessions & apply for leaves",
    icon:   <UserCheck className="h-4 w-4" />,
    color:  "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400 hover:bg-blue-100",
    active: "border-blue-500 bg-blue-100 ring-2 ring-blue-300 text-blue-800",
  },
  {
    value:  "parent" as const,
    label:  "Parent / Client",
    desc:   "View sessions & request reschedules",
    icon:   <Users className="h-4 w-4" />,
    color:  "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100",
    active: "border-emerald-500 bg-emerald-100 ring-2 ring-emerald-300 text-emerald-800",
  },
  {
    value:  "manager" as const,
    label:  "Manager",
    desc:   "Oversee branches & approve leaves",
    icon:   <Briefcase className="h-4 w-4" />,
    color:  "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100",
    active: "border-amber-500 bg-amber-100 ring-2 ring-amber-300 text-amber-800",
  },
  {
    value:  "admin" as const,
    label:  "Admin",
    desc:   "Full access to all settings & staff",
    icon:   <ShieldCheck className="h-4 w-4" />,
    color:  "border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-400 hover:bg-violet-100",
    active: "border-violet-500 bg-violet-100 ring-2 ring-violet-300 text-violet-800",
  },
];

// ── Component ────────────────────────────────────────────────────────────────
export function RegisterForm() {
  const { login }                   = useAuth();
  const navigate                    = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showPw,     setShowPw]     = useState(false);
  const [showCPw,    setShowCPw]    = useState(false);

  const form = useForm<FormData>({
    resolver:      zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "" },
  });

  const selectedRole = form.watch("role");

  const onSubmit = async (values: FormData) => {
    setSubmitting(true);
    try {
      // POST to backend register endpoint using axiosClient (uses VITE_API_URL)
      await apiClient.post("/auth/register/", {
        name:     values.name,
        email:    values.email,
        phone:    values.phone ?? "",
        role:     values.role,
        password: values.password,
      });

      toast.success("Account created! Signing you in…");

      // Auto-login after registration
      const { redirectTo } = await login(values.email, values.password);
      navigate({ to: redirectTo as any, replace: true });
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ??
        e?.message ??
        "Something went wrong. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-[44%] mesh-bg flex-col justify-between p-12 text-white relative overflow-hidden">
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

        {/* Content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-white mb-3">
              Join the team.<br />Pick your role.
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-xs">
              Create your account and get instant access to your role-specific dashboard.
            </p>
          </div>

          <div className="space-y-3">
            {ROLES.map((r) => (
              <div
                key={r.value}
                className="flex gap-3 items-center p-3.5 rounded-xl bg-white/5 border border-white/[0.08]"
              >
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-white/80">
                  {r.icon}
                </div>
                <div>
                  <p className="font-semibold text-sm text-white">{r.label}</p>
                  <p className="text-xs text-white/50 mt-0.5">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/30">(c) 2025 Bright Steps. All rights reserved.</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background overflow-y-auto">
        <div className="w-full max-w-[420px] space-y-6">

          {/* Mobile logo */}
          <div className="flex flex-col items-center lg:hidden pb-1">
            <div className="h-12 w-12 rounded-2xl mesh-bg text-white flex items-center justify-center text-xl font-black shadow-lg shadow-indigo-500/25">V</div>
            <h1 className="mt-3 text-xl font-bold tracking-tight">Bright Steps</h1>
            <p className="text-sm text-muted-foreground">Staff Planner</p>
          </div>

          {/* Heading */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Fill in your details and choose your role to get started.
            </p>
          </div>

          {/* ── Role picker ── */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Your Role</Label>
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => field.onChange(r.value)}
                      className={cn(
                        "flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer",
                        field.value === r.value ? r.active : r.color
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-sm">
                        {r.icon}
                        {r.label}
                      </div>
                      <p className="text-[11px] leading-tight opacity-70">{r.desc}</p>
                    </button>
                  ))}
                </div>
              )}
            />
            {form.formState.errors.role && (
              <p className="text-xs text-destructive">{form.formState.errors.role.message}</p>
            )}
          </div>

          {/* ── Form fields ── */}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="Your full name"
                  autoComplete="name"
                  {...form.register("name")}
                  className={cn(
                    "h-10 pl-9 text-sm",
                    form.formState.errors.name ? "border-destructive" : ""
                  )}
                />
              </div>
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...form.register("email")}
                className={cn(
                  "h-10 text-sm",
                  form.formState.errors.email ? "border-destructive" : ""
                )}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            {/* Phone (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-medium">
                Phone <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                autoComplete="tel"
                {...form.register("phone")}
                className="h-10 text-sm"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  {...form.register("password")}
                  className={cn(
                    "h-10 pr-10 text-sm",
                    form.formState.errors.password ? "border-destructive" : ""
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showCPw ? "text" : "password"}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  {...form.register("confirmPassword")}
                  className={cn(
                    "h-10 pr-10 text-sm",
                    form.formState.errors.confirmPassword ? "border-destructive" : ""
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowCPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showCPw ? "Hide password" : "Show password"}
                >
                  {showCPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.confirmPassword && (
                <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-10 text-sm font-semibold gap-2 bg-primary hover:bg-primary-hover shadow-md shadow-indigo-500/25 transition-all"
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Creating account…</>
              ) : (
                <><span>Create {selectedRole ? `${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} ` : ""}Account</span><ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </form>

          {/* Link to login */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}