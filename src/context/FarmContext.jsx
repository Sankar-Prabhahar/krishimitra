import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../supabaseClient';

const FarmContext = createContext();

export const FarmProvider = ({ children }) => {
  const { user, updateUser, isAuthenticated } = useAuth();
  const [farmProfile, setFarmProfile] = useState({
    farmName: 'My Farm',
    farmSize: 1,
    location: { lat: null, lng: null, city: '' },
    soilType: 'alluvial',
    waterAvailability: 'moderate',
    currentCrop: '',
    sowingDate: null,
    isNotDecided: true
  });
  const [loading, setLoading] = useState(false);
  
  // Disease tracking state
  const [activeDisease, setActiveDisease] = useState(null);
  const [diseaseHistory, setDiseaseHistory] = useState([]);

  // Sync farm profile from user data
  useEffect(() => {
    if (user) {
      if (user.farmProfile) setFarmProfile(user.farmProfile);
      if (user.activeDisease) setActiveDisease(user.activeDisease);
      if (user.diseaseHistory) setDiseaseHistory(user.diseaseHistory);
    }
  }, [user]);

  const updateProfileInSupabase = async (updates) => {
    if (!user || user.isGuest) return true;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
        
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error updating supabase:', err);
      return false;
    }
  };

  const updateFarmProfile = async (profileData) => {
    try {
      setLoading(true);
      setFarmProfile(profileData);
      
      const success = await updateProfileInSupabase({ farmProfile: profileData });
      
      if (success && updateUser && user) {
        updateUser({
          ...user,
          farmProfile: profileData,
          isProfileComplete: true
        });
      }
      return { success };
    } catch (err) {
      console.error('Update farm profile error:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const getDaysSinceSowing = () => {
    if (farmProfile.isNotDecided || !farmProfile.sowingDate) {
      return 30; // Default value
    }
    const sowing = new Date(farmProfile.sowingDate);
    const today = new Date();
    const diffTime = Math.abs(today - sowing);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const reportDisease = async (diseaseData) => {
    const newDisease = {
      id: Date.now(),
      ...diseaseData,
      detectedAt: new Date(),
      status: 'active',
      treatmentProgress: 0
    };
    
    setActiveDisease(newDisease);
    const newHistory = [newDisease, ...diseaseHistory].slice(0, 20);
    setDiseaseHistory(newHistory);
    
    await updateProfileInSupabase({ 
      activeDisease: newDisease,
      diseaseHistory: newHistory
    });
    
    if (updateUser && user) {
      updateUser({ ...user, activeDisease: newDisease, diseaseHistory: newHistory });
    }
  };

  const updateDiseaseProgress = async (progress) => {
    if (!activeDisease) return;
    
    const updated = { ...activeDisease, treatmentProgress: progress };
    let newActive = updated;
    
    if (progress >= 100) {
      updated.status = 'resolved';
      updated.resolvedAt = new Date();
      newActive = null;
    }
    
    setActiveDisease(newActive);
    const newHistory = diseaseHistory.map(d => d.id === updated.id ? updated : d);
    setDiseaseHistory(newHistory);
    
    await updateProfileInSupabase({ 
      activeDisease: newActive,
      diseaseHistory: newHistory
    });
    
    if (updateUser && user) {
      updateUser({ ...user, activeDisease: newActive, diseaseHistory: newHistory });
    }
  };

  const clearActiveDisease = async () => {
    if (!activeDisease) return;
    
    const newHistory = diseaseHistory.map(d => 
      d.id === activeDisease.id ? { ...d, status: 'resolved', resolvedAt: new Date() } : d
    );
    
    setActiveDisease(null);
    setDiseaseHistory(newHistory);
    
    await updateProfileInSupabase({ 
      activeDisease: null,
      diseaseHistory: newHistory
    });
    
    if (updateUser && user) {
      updateUser({ ...user, activeDisease: null, diseaseHistory: newHistory });
    }
  };

  return (
    <FarmContext.Provider value={{
      farmProfile,
      loading,
      updateFarmProfile,
      getDaysSinceSowing,
      farmSize: farmProfile.farmSize,
      soilType: farmProfile.soilType,
      waterAvailability: farmProfile.waterAvailability,
      currentCrop: farmProfile.currentCrop,
      sowingDate: farmProfile.sowingDate,
      isNotDecided: farmProfile.isNotDecided,
      activeDisease,
      diseaseHistory,
      reportDisease,
      updateDiseaseProgress,
      clearActiveDisease
    }}>
      {children}
    </FarmContext.Provider>
  );
};

export const useFarm = () => {
  const context = useContext(FarmContext);
  if (!context) {
    throw new Error('useFarm must be used within a FarmProvider');
  }
  return context;
};
