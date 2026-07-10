// ============================================================
// PWA ICONS - DYNAMIC GENERATION
// ============================================================

// Generate icon using canvas
function generatePWAIcon(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Background
    const radius = size * 0.15;
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(size - radius, 0);
    ctx.quadraticCurveTo(size, 0, size, radius);
    ctx.lineTo(size, size - radius);
    ctx.quadraticCurveTo(size, size, size - radius, size);
    ctx.lineTo(radius, size);
    ctx.quadraticCurveTo(0, size, 0, size - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    
    // Gradient background
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#0B0D14');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Border accent
    ctx.strokeStyle = '#F5A623';
    ctx.lineWidth = size * 0.02;
    ctx.stroke();
    
    // Paper plane icon
    const iconSize = size * 0.55;
    const centerX = size / 2;
    const centerY = size / 2 + size * 0.05;
    
    ctx.fillStyle = '#F5A623';
    ctx.shadowColor = 'rgba(245, 166, 35, 0.3)';
    ctx.shadowBlur = size * 0.05;
    
    // Draw paper plane
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - iconSize * 0.5);
    ctx.lineTo(centerX - iconSize * 0.6, centerY + iconSize * 0.3);
    ctx.lineTo(centerX - iconSize * 0.2, centerY + iconSize * 0.1);
    ctx.lineTo(centerX, centerY + iconSize * 0.5);
    ctx.lineTo(centerX + iconSize * 0.2, centerY + iconSize * 0.1);
    ctx.lineTo(centerX + iconSize * 0.6, centerY + iconSize * 0.3);
    ctx.closePath();
    ctx.fill();
    
    // Small accent
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(centerX - iconSize * 0.15, centerY - iconSize * 0.2, iconSize * 0.08, 0, Math.PI * 2);
    ctx.fill();
    
    return canvas.toDataURL('image/png');
}

// Generate and set icons
function setPWAIcons() {
    const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
    const icons = {};
    
    sizes.forEach(size => {
        icons[size] = generatePWAIcon(size);
    });
    
    // Update manifest icons
    const manifest = {
        name: "TravelOS - AI Travel Companion",
        short_name: "TravelOS",
        description: "AI-powered travel planning & budget tracking",
        start_url: "/",
        display: "standalone",
        background_color: "#0B0D14",
        theme_color: "#F5A623",
        icons: sizes.map(size => ({
            src: icons[size],
            sizes: `${size}x${size}`,
            type: "image/png",
            purpose: "any maskable"
        }))
    };
    
    // Update manifest link
    const manifestBlob = new Blob([JSON.stringify(manifest)], {type: 'application/json'});
    const manifestURL = URL.createObjectURL(manifestBlob);
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
        manifestLink.href = manifestURL;
    }
}

// Call on load
document.addEventListener('DOMContentLoaded', setPWAIcons);

// Also generate favicon
function generateFavicon() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#0B0D14';
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#F5A623';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✈', 32, 34);
    
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.href = canvas.toDataURL('image/png');
    document.head.appendChild(link);
}

// Generate favicon if no icon exists
if (!document.querySelector('link[rel="icon"]')) {
    generateFavicon();
}