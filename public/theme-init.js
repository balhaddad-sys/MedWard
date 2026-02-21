// Synchronous theme init — prevents flash of wrong theme
// Must run before first paint. Reads persisted theme from localStorage
// and applies the "dark" class to <html> if needed.
(function(){try{var s=localStorage.getItem('medward-settings');if(s){var d=JSON.parse(s),t=(d.state||d).theme||'system';if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}else if(matchMedia('(prefers-color-scheme:dark)').matches)document.documentElement.classList.add('dark')}catch(e){}})();
