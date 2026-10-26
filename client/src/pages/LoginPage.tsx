import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Lock, Mail, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input, FormField } from '../components/ui/Input';
import { Alert } from '../components/ui/Alert';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('admin@warehouse.local');
  const [password, setPassword] = useState('••••••••••••');
  const [role, setRole] = useState('SUPER_ADMIN');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError('Please provide an email address.');
      return;
    }
    setIsLoading(true);
    try {
      const success = await login(email, role);
      if (success) {
        navigate('/');
      } else {
        setError('Invalid credentials or unauthorized facility access.');
      }
    } catch {
      setError('Unable to reach authentication gateway. Please check network.');
    } finally {
      setIsLoading(false);
    }
  };

  const setDemoUser = (demoEmail: string, demoRole: string) => {
    setEmail(demoEmail);
    setPassword('demo-wms-2026');
    setRole(demoRole);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[400px] h-[300px] bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Brand Header */}
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-xl shadow-brand-500/25 ring-1 ring-white/20">
            <Layers className="w-7 h-7" />
          </div>
        </div>
        <h2 className="text-center text-2xl font-extrabold tracking-tight text-white">
          LOGIX <span className="text-brand-400">WMS</span>
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Enterprise Warehouse & Supply Chain Management Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl shadow-black/80 rounded-2xl border border-slate-800">
          {error && (
            <Alert
              type="error"
              message={error}
              onDismiss={() => setError(null)}
              className="mb-5"
            />
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <FormField label="Enterprise Email Address" required>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@warehouse.company"
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />
            </FormField>

            <FormField label="Security Password" required>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                leftIcon={<Lock className="w-4 h-4" />}
                required
              />
            </FormField>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-700 bg-slate-950 text-brand-500 focus:ring-brand-500"
                />
                Remember terminal session
              </label>
              <span className="text-brand-400 hover:text-brand-300 cursor-pointer">
                Forgot password?
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Authenticate & Enter Warehouse
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
              <ShieldCheck className="w-4 h-4 text-brand-400" />
              One-Click Quick Test Personas
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setDemoUser('admin@warehouse.local', 'SUPER_ADMIN')}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-left text-xs transition-colors"
              >
                <div>
                  <div className="font-semibold text-slate-200">Sarah Connor</div>
                  <div className="text-[10px] text-slate-400">admin@warehouse.local</div>
                </div>
                <span className="text-[10px] font-mono text-brand-400 bg-brand-950/60 px-2 py-0.5 rounded border border-brand-800/60">
                  Super Admin
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDemoUser('manager@warehouse.local', 'WAREHOUSE_MANAGER')}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-left text-xs transition-colors"
              >
                <div>
                  <div className="font-semibold text-slate-200">Marcus Vance</div>
                  <div className="text-[10px] text-slate-400">manager@warehouse.local</div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                  Ops Manager
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDemoUser('picker@warehouse.local', 'OUTBOUND_OPERATOR')}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-left text-xs transition-colors"
              >
                <div>
                  <div className="font-semibold text-slate-200">Elena Rostova</div>
                  <div className="text-[10px] text-slate-400">picker@warehouse.local</div>
                </div>
                <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60">
                  Picker / Pack
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Compliance Footer */}
        <div className="mt-6 text-center text-[11px] text-slate-500">
          TLS 1.3 Encrypted • Zero-Trust Access • Audit Logging Enforced
        </div>
      </div>
    </div>
  );
};
