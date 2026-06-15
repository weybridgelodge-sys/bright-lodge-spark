import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Clock, LogOut } from "lucide-react";
import logo from "@/assets/weybridge-logo.svg";

export default function MembersPending() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/members/login");
  };

  return (
    <div className="min-h-screen bg-navy text-primary-foreground flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-navy-dark/70 border border-gold/20 rounded-sm p-8 text-center backdrop-blur">
        <img src={logo} alt="" className="h-14 w-14 mx-auto bg-primary-foreground/80 rounded-full p-1 mb-4" />
        <Clock className="w-10 h-10 text-gold mx-auto mb-4" aria-hidden="true" />
        <h1 className="font-serif text-2xl text-gold mb-3">Awaiting approval</h1>
        <p className="text-sm text-primary-foreground/70 mb-2">
          Thank you{profile?.full_name ? `, ${profile.full_name}` : ""}.
        </p>
        <p className="text-sm text-primary-foreground/70 mb-6">
          Your request to access the Members Portal has been received. The Lodge Secretary will verify your details and
          activate your account shortly. You'll be able to sign in once approved.
        </p>
        <div className="flex flex-col gap-2">
          <Link to="/" className="text-sm border border-gold/40 text-gold px-4 py-2 rounded-sm hover:bg-gold/10">
            Return to public site
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 text-xs text-primary-foreground/50 hover:text-gold py-2"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
