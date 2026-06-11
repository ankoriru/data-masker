    // ==================== USER DETECTION ====================
    function extractUsernameFromPath(path) {
        if (!path) return null;
        var usersMatch = path.match(/\\Users\\([^\\]+)\\Documents/i);
        if (usersMatch && usersMatch[1]) return usersMatch[1];
        var altMatch = path.match(/\\Users\\([^\\]+)/i);
        if (altMatch && altMatch[1]) return altMatch[1];
        return null;
    }
    function extractCleanUsername(rawLogin) {
        if (!rawLogin) return 'unknown';
        var clean = rawLogin.trim();
        clean = clean.replace(/@[^@]+$/, '');
        clean = clean.replace(/^[^\\]+\\/, '');
        clean = clean.replace(/^.*[\/\\]/, '');
        clean = clean.split('.')[0] || clean;
        return clean || 'unknown';
    }
    function extractDomainAndUser(rawLogin) {
        if (!rawLogin) return { domain: 'UNKNOWN', username: 'unknown' };
        var clean = rawLogin.trim();
        var domainMatch = clean.match(/^([^\\]+)\\(.+)$/);
        if (domainMatch) return { domain: domainMatch[1], username: domainMatch[2] };
        var emailMatch = clean.match(/^(.+)@(.+)$/);
        if (emailMatch) return { domain: emailMatch[2], username: emailMatch[1] };
        return { domain: 'UNKNOWN', username: clean };
    }
    async function detectUser() {
        var savedLogin = localStorage.getItem('ad_login');
        if (savedLogin) { var parsed = extractDomainAndUser(savedLogin); state.currentUser = parsed.username; state.userDomain = parsed.domain; return state.currentUser; }
        try { var fileInput = document.getElementById('fileInput'); if (fileInput && fileInput.value) { var path = fileInput.value; var username = extractUsernameFromPath(path); if (username) { localStorage.setItem('ad_login', username); var parsed = extractDomainAndUser(username); state.currentUser = parsed.username; state.userDomain = parsed.domain; return state.currentUser; } } } catch(e){}
        try { if (typeof ActiveXObject !== 'undefined') { var wsh = new ActiveXObject('WScript.Network'); var username = wsh.UserName; var domain = wsh.UserDomain; if (username && username !== '') { var fullName = domain ? domain + '\\' + username : username; localStorage.setItem('ad_login', fullName); state.currentUser = username; state.userDomain = domain || 'UNKNOWN'; return state.currentUser; } } } catch(e){}
        var endpoints = ['/api/auth/user', '/auth/current-user', '/user/info', '/api/user/current', '/api/whoami'];
        for (var i = 0; i < endpoints.length; i++) { try { var controller = new AbortController(); var timeoutId = setTimeout(function(){ controller.abort(); }, 1000); var response = await fetch(endpoints[i], { credentials: 'include', signal: controller.signal }); clearTimeout(timeoutId); if (response.ok) { var data = await response.json(); var login = data.login || data.username || data.user || data.name; if (login && login !== '') { localStorage.setItem('ad_login', login); var parsed = extractDomainAndUser(login); state.currentUser = parsed.username; state.userDomain = parsed.domain; return state.currentUser; } } } catch(e){} }
        try { var urlParams = new URLSearchParams(window.location.search); var userParam = urlParams.get('user') || urlParams.get('username') || urlParams.get('login'); if (userParam && userParam !== '') { localStorage.setItem('ad_login', userParam); var parsed = extractDomainAndUser(userParam); state.currentUser = parsed.username; state.userDomain = parsed.domain; return state.currentUser; } } catch(e){}
        try { var hostname = window.location.hostname; if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') { var fallbackUser = hostname.split('.')[0]; localStorage.setItem('ad_login', fallbackUser); state.currentUser = fallbackUser; state.userDomain = 'UNKNOWN'; return state.currentUser; } } catch(e){}
        var fallbackUser = 'user_' + Date.now().toString(36).substring(0, 6); localStorage.setItem('ad_login', fallbackUser); state.currentUser = fallbackUser; state.userDomain = 'UNKNOWN'; return state.currentUser;
    }
    async function detectInternalIP() { return new Promise(function(resolve) { try { var RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection; if (!RTCPeerConnection) { state.internalIP = null; resolve(null); return; } var pc = new RTCPeerConnection({ iceServers: [] }); pc.createDataChannel(''); pc.onicecandidate = function(e) { if (!e.candidate) { pc.close(); resolve(state.internalIP); return; } var ipMatch = /([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/.exec(e.candidate.candidate); if (ipMatch && !state.internalIP) { var ip = ipMatch[1]; if (ip.startsWith('10.') || ip.startsWith('172.') || ip.startsWith('192.168.')) state.internalIP = ip; } }; pc.createOffer().then(function(offer){ pc.setLocalDescription(offer); }); setTimeout(function(){ pc.close(); resolve(state.internalIP || null); }, 2000); } catch(e) { state.internalIP = null; resolve(null); } }); }
    function getDisplayIP() { var external = state.userIP || '0.0.0.0'; var internal = state.internalIP; var ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/; if (!ipRegex.test(external)) external = '0.0.0.0'; if (!internal || internal === external) return external; return external + ' / ' + internal; }

