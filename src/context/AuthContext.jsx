import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchProfile(session.user);
      } else {
        const isGuest = localStorage.getItem('isGuest');
        if (isGuest === 'true') {
          setGuestUser();
        } else {
          setLoading(false);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile(session.user);
      } else {
        const isGuest = localStorage.getItem('isGuest');
        if (!isGuest) {
          setUser(null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const setGuestUser = () => {
    setUser({
      id: 'guest',
      name: 'Guest User',
      email: 'guest@krishimitra.com',
      isGuest: true,
      isProfileComplete: true
    });
    setLoading(false);
  };

  const fetchProfile = async (authUser) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      
      let profileData = data;
      
      // Auto-create profile if missing
      if (!profileData) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([{ 
            id: authUser.id, 
            email: authUser.email,
            name: authUser.email.split('@')[0]
          }])
          .select()
          .maybeSingle();
          
        if (!insertError) profileData = newProfile;
      }
      
      setUser({
        id: authUser.id,
        email: authUser.email,
        name: profileData?.name || authUser.email.split('@')[0],
        farmProfile: profileData?.farmProfile || null,
        activeDisease: profileData?.activeDisease || null,
        diseaseHistory: profileData?.diseaseHistory || [],
        isProfileComplete: !!profileData?.farmProfile,
        isGuest: false
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name, email, password) => {
    try {
      setError(null);
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{ 
            id: data.user.id, 
            email: data.user.email,
            name: name
          }]);
          
        if (profileError) console.error('Profile creation error:', profileError);
      }

      return { success: true, user: data.user };
    } catch (err) {
      setError(err.message || 'Signup failed');
      return { success: false, error: err.message };
    }
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { success: true, user: data.user };
    } catch (err) {
      setError(err.message || 'Login failed');
      return { success: false, error: err.message };
    }
  };

  const loginAsGuest = () => {
    localStorage.setItem('isGuest', 'true');
    setGuestUser();
    return { success: true, user: { name: 'Guest User' } };
  };

  const logout = async () => {
    localStorage.removeItem('isGuest');
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const getToken = () => null; // Not needed for supabase client

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      isAuthenticated: !!user,
      isProfileComplete: user?.isProfileComplete || false,
      signup,
      login,
      loginAsGuest,
      logout,
      updateUser,
      getToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
