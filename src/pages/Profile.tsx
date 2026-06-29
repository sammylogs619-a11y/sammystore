import { useEffect, useState } from 'react';
import { Loader2, User as UserIcon, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

type Profile = { display_name: string | null; email: string | null; phone: string | null; created_at: string };

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) { setLoading(false); return; }
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setProfile(data as Profile);
          setDisplayName(data.display_name ?? '');
          setPhone(data.phone ?? '');
        }
        setLoading(false);
      });
  }, [user]);

  const onSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').upsert(
      {
        id: user.id,
        email: user.email ?? null,
        display_name: displayName.trim() || null,
        phone: phone.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    setSaving(false);
    if (error) toast.error(error.message || 'Failed to update profile');
    else toast.success('Profile updated!');
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match');
    if (password.length < 8) return toast.error('Minimum 8 characters');
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setPwLoading(false);
    if (error) toast.error(error.message);
    else { toast.success('Password updated!'); setPassword(''); setConfirm(''); }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-fadeIn">
        <div className="h-8 w-40 bg-white/10 animate-pulse rounded-lg" />
        <div className="h-64 bg-[#13151c] border border-[#252836] rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="font-poppins text-2xl font-bold text-white">Profile Settings</h2>
        <p className="text-gray-500 text-sm mt-1">Manage your account information and security</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[#13151c] rounded-2xl border border-[#252836] p-6 space-y-4">
          <h3 className="font-semibold text-white text-lg flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-indigo-400" /> Profile Information
          </h3>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
            <input value={user?.email ?? ''} readOnly
              className="w-full bg-[#0f1117] border border-[#252836] rounded-xl px-4 py-2.5 text-gray-400 text-sm cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Display Name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name"
              className="w-full bg-[#0f1117] border border-[#252836] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..."
              className="w-full bg-[#0f1117] border border-[#252836] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <button onClick={onSaveProfile} disabled={saving}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>

        <div className="bg-[#13151c] rounded-2xl border border-[#252836] p-6 space-y-4">
          <h3 className="font-semibold text-white text-lg flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-400" /> Change Password
          </h3>
          <form onSubmit={onChangePassword} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">New Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" required
                className="w-full bg-[#0f1117] border border-[#252836] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Confirm Password</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" required
                className="w-full bg-[#0f1117] border border-[#252836] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <button type="submit" disabled={pwLoading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2">
              {pwLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Password
            </button>
          </form>
        </div>
      </div>

      {profile?.created_at && (
        <p className="text-xs text-gray-500">
          Member since {new Date(profile.created_at).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
        </p>
      )}
    </div>
  );
}
