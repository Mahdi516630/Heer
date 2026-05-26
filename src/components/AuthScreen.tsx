import React, { useState } from "react";
import { Shield, Mail, User, Sparkles, Key, AlertTriangle, ArrowRight, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { User as UserType } from "../types";

interface AuthScreenProps {
  onAuthSuccess: (user: UserType) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<"input" | "otp">("input");
  
  // Fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState("");
  
  // Statuses
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fallbackOtp, setFallbackOtp] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setFallbackOtp(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Veuillez saisir une adresse email valide.");
      return;
    }

    if (!password) {
      setError("Veuillez saisir un mot de passe.");
      return;
    }

    setLoading(true);

    if (mode === "login") {
      // Direct Password Login (No OTP verification)
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmedEmail,
            password
          })
        });

        const data = await response.json();
        setLoading(false);

        if (response.ok && data.success && data.user) {
          setSuccess("Connexion réussie ! Redirection...");
          setTimeout(() => {
            onAuthSuccess(data.user);
          }, 800);
        } else {
          setError(data.error || "Adresse email ou mot de passe incorrect.");
        }
      } catch (err) {
        setLoading(false);
        setError("Impossible de contacter le serveur d'authentification.");
        console.error(err);
      }
    } else {
      // Inscription/Register: Validate fields first, then send OTP
      if (!username.trim()) {
        setError("Veuillez choisir un nom d'utilisateur (@).");
        setLoading(false);
        return;
      }
      if (!fullName.trim()) {
        setError("Veuillez renseigner votre nom complet.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: trimmedEmail,
            username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""),
            fullName: fullName.trim(),
            password
          })
        });

        const data = await response.json();
        setLoading(false);

        if (response.ok && data.success) {
          setStep("otp");
          setSuccess("Code de sécurité envoyé ! Vérifiez votre messagerie.");
          
          // Handle developer console fallback gracefully
          if ("fallbackOtp" in data && data.fallbackOtp) {
            setFallbackOtp(data.fallbackOtp);
          }
        } else {
          setError(data.error || "Une erreur est survenue lors du démarrage de l'inscription.");
        }
      } catch (err) {
        setLoading(false);
        setError("Impossible de contacter le serveur d'authentification.");
        console.error(err);
      }
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Veuillez saisir le code à 6 chiffres.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim()
        })
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok && data.success && data.user) {
        setSuccess("Véritable confirmation d'inscription ! Bienvenue sur HEER.");
        setTimeout(() => {
          onAuthSuccess(data.user);
        }, 800);
      } else {
        setError(data.error || "Code incorrect ou expiré.");
      }
    } catch (err) {
      setLoading(false);
      setError("Erreur lors de la validation du code.");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex items-center justify-center p-4 relative overflow-hidden antialiased">
      {/* Design Backdrops */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.06)_0,transparent_55%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="p-3 bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 rounded-2xl text-white mb-4 shadow-lg shadow-pink-500/10">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tighter bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 bg-clip-text text-transparent uppercase">
            HEER.
          </h1>
          <p className="text-xs text-neutral-500 uppercase tracking-widest font-mono font-bold mt-1">
            Chiffrement de bout en bout // E2EE Network
          </p>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-start gap-2 animate-shake">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-start gap-2">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* Local Console Fallback Block for Smooth Sandbox Testing */}
        {step === "otp" && fallbackOtp && (
          <div className="mb-6 p-3.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-bold">
              <Key className="w-4 h-4" />
              <span>🛠️ MODE SANS SERVEUR SMTP ACTIF</span>
            </div>
            <p className="text-neutral-400 leading-normal">
              Aucun identifiant SMTP n'est configuré dans le fichier d'environnement. Le code hérité a été redirigé :
            </p>
            <div className="flex items-center justify-between bg-black/50 border border-yellow-500/20 rounded-lg px-3 py-1.5 font-mono text-white text-sm">
              <span>Code OTP de test :</span>
              <span className="font-bold tracking-wider text-yellow-400">{fallbackOtp}</span>
            </div>
          </div>
        )}

        {/* Step Rendering */}
        {step === "input" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mode Switcher */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-1 flex mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${
                  mode === "login"
                    ? "bg-gradient-to-r from-pink-500 to-yellow-500 text-white font-bold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${
                  mode === "register"
                    ? "bg-gradient-to-r from-pink-500 to-yellow-500 text-white font-bold"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Inscription
              </button>
            </div>

            {mode === "register" && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono font-bold">Nom complet</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4.5 h-4.5 text-neutral-500" />
                    <input
                      type="text"
                      required
                      placeholder="Aria Vance"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 pl-10 pr-4 text-sm text-neutral-200 focus:outline-none focus:border-pink-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono font-bold">Identifiant (@)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-neutral-500 text-sm font-mono">@</span>
                    <input
                      type="text"
                      required
                      placeholder="ariavance"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 pl-9 pr-4 text-sm text-neutral-200 focus:outline-none focus:border-pink-500 transition-colors font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono font-bold">Adresse Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4.5 h-4.5 text-neutral-500" />
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 pl-10 pr-4 text-sm text-neutral-200 focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono font-bold">Mot de passe</label>
              <div className="relative">
                <Key className="absolute left-3 top-2.5 w-4.5 h-4.5 text-neutral-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-2 pl-10 pr-4 text-sm text-neutral-200 focus:outline-none focus:border-pink-500 transition-colors font-mono"
                />
              </div>
              <p className="text-[10px] text-neutral-500 leading-normal pt-1 font-mono">
                {mode === "login" 
                  ? "// Pour un compte existant. S'il n'a pas de mot de passe, saisir n'importe quel mot de passe l'initialisera." 
                  : "// Définissez un mot de passe de sécurité pour protéger votre clé de chiffrement."}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-500/10 cursor-pointer disabled:opacity-50 mt-2"
            >
              <span>
                {loading 
                  ? (mode === "login" ? "Connexion en cours..." : "Génération du code...") 
                  : (mode === "login" ? "Se connecter" : "S'inscrire (recevoir un code OTP)")}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-xs text-neutral-400 leading-relaxed">
                Un code d'authentification cryptographique unique a été envoyé à l'adresse 
                <span className="text-white font-mono block font-bold mt-1 text-sm">{email}</span>.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-neutral-400 uppercase tracking-widest font-mono font-bold text-center block">
                Code de sécurité (6 chiffres)
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-pink-500 rounded-xl py-3 text-center tracking-[12px] text-xl font-bold font-mono focus:outline-none transition-all text-white"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg shadow-pink-500/10 cursor-pointer disabled:opacity-50"
              >
                <span>{loading ? "Vérification..." : "Vérifier & Ouvrir HEER"}</span>
                <Shield className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("input");
                  setOtp("");
                  setError("");
                  setSuccess("");
                }}
                className="flex items-center justify-center gap-1.5 py-2 text-xs text-neutral-400 hover:text-white border border-neutral-800/60 rounded-xl hover:bg-neutral-800/10 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour</span>
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
