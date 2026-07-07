// Clear invalid JWT tokens from localStorage
console.log('🔄 Clearing old auth tokens...');
localStorage.removeItem('perbillion-auth');
console.log('✅ Auth tokens cleared. Please refresh the page and login again.');
