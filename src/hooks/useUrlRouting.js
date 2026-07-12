import { useEffect, useCallback } from 'react';

export const useUrlRouting = (
  view,
  setView,
  selectedSurah,
  setSelectedSurah,
  partnerSubView,
  setPartnerSubView,
  loading,
  error,
  surahs
) => {
  const syncStateWithURL = useCallback((sList) => {
    if (!sList || sList.length === 0) return;
    
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    const p = new URLSearchParams(window.location.search);

    let s = sList.find(x => x.number === Number(p.get('surah')));
    let v = p.get('view') || 'list';
    let pv = p.get('partnerView') || 'config';

    if (parts.length > 0) {
      if (parts[0] === 'surah' && parts[1]) {
        s = sList.find(x => x.number === Number(parts[1]));
        v = 'detail';
        if (parts[2] === 'partner' && parts[3]) {
          v = 'partner';
          pv = parts[3];
        } else if (parts[2] === 'mutashabihat') {
          v = 'mutashabihat-session';
        }
      } else if (parts[0] === 'partner' && parts[1]) {
        v = 'partner';
        pv = parts[1];
      } else if (parts[0] === 'mutashabihat') {
        if (parts[1] === 'custom') v = 'mutashabihat-selection';
        else if (parts[1] === 'session') v = 'mutashabihat-multi-session';
      } else if (parts[0] === 'weaknesses') {
        v = 'weaknesses';
      }
    } else if (!p.get('view')) {
      v = 'list';
    }

    if (s) setSelectedSurah(s);
    if (v) setView(v);
    if (pv) setPartnerSubView(pv);
  }, [setSelectedSurah, setView, setPartnerSubView]);

  useEffect(() => {
    if (!surahs || surahs.length === 0) return;
    const handlePopState = () => syncStateWithURL(surahs);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [surahs, syncStateWithURL]);

  useEffect(() => {
    if (loading || error) return;

    let newPath = '/';
    if (view === 'detail' && selectedSurah) {
      newPath = `/surah/${selectedSurah.number}`;
    } else if (view === 'partner') {
      newPath = selectedSurah ? `/surah/${selectedSurah.number}/partner/${partnerSubView}` : `/partner/${partnerSubView}`;
    } else if (view === 'mutashabihat-session' && selectedSurah) {
      newPath = `/surah/${selectedSurah.number}/mutashabihat`;
    } else if (view === 'mutashabihat-selection') {
      newPath = `/mutashabihat/custom`;
    } else if (view === 'mutashabihat-multi-session') {
      newPath = `/mutashabihat/session`;
    } else if (view === 'weaknesses') {
      newPath = `/weaknesses`;
    }

    const currentPath = window.location.pathname;
    if (currentPath !== newPath) {
      if (window.location.search || currentPath === '/') {
        window.history.replaceState({}, '', newPath);
      } else {
        window.history.pushState({}, '', newPath);
      }
    }
  }, [view, selectedSurah, partnerSubView, loading, error]);

  return { syncStateWithURL };
};
