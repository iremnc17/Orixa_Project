let sepet = [];
let toplamTutar = 0;
let localProductsPool = []; 

// GÜNCELLEME: API_BASE_URL boş bırakılarak tarayıcının otomatik olarak ana domaini kullanması sağlandı.
const API_BASE_URL = ""; 

if (localStorage.getItem("cart")) {
    sepet = JSON.parse(localStorage.getItem("cart"));
    toplamTutar = sepet.reduce((sum, item) => sum + parseFloat(item.fiyat || 0), 0);
    setTimeout(() => {
        const sepetButonu = document.querySelector('.nav-btn');
        if (sepetButonu) {
            sepetButonu.innerText = `🛒 Sepet (${sepet.length})`;
        }
    }, 100);
}

function oturumArayuzunuGuncelle() {
    const aktifKullanici = JSON.parse(localStorage.getItem("user"));
    const authNavContainer = document.getElementById("authNavContainer"); 

    if (authNavContainer && aktifKullanici) {
        authNavContainer.innerHTML = `
            <span style="color: #38bdf8; font-weight: bold; margin-right: 15px; font-size: 0.95rem;">👋 Hoş geldin, ${aktifKullanici.username}</span>
            ${aktifKullanici.is_admin === 1 ? '<a href="/admin" class="nav-link" style="color:#a855f7; margin-right:15px; text-decoration:none; font-weight:bold;">🛠️ Panel</a>' : ''}
            <button onclick="oturumuKapat()" class="nav-btn" style="background: linear-gradient(135deg, #f43f5e, #e11d48); padding: 8px 16px; border: none; border-radius: 6px; color: white; cursor: pointer; font-weight: bold; font-family: 'Inter', sans-serif;">Oturumu Kapat</button>
        `;
    }
}

function oturumuKapat() {
    localStorage.removeItem("user");
    localStorage.removeItem("cart"); 
    showToast("Oturum güvenli bir şekilde kapatıldı.", "success");
    setTimeout(() => { window.location.href = "/"; }, 1000);
}

function sepeteEkle(urunAdi, fiyat, id) {
    const netFiyat = parseFloat(fiyat);
    
    if (netFiyat === 0) {
        showToast(`${urunAdi} ücretsizdir! Doğrudan sepetinizden simüle ederek indirebilirsiniz.`, "success");
    }
    
    sepet.push({ urunAdi, fiyat: netFiyat, id });
    toplamTutar = sepet.reduce((sum, item) => sum + item.fiyat, 0); 
    
    localStorage.setItem("cart", JSON.stringify(sepet));
    
    showToast(`${urunAdi} sepete eklendi!`, "success");
    
    const sepetButonu = document.querySelector('.nav-btn');
    if (sepetButonu) {
        sepetButonu.innerText = `🛒 Sepet (${sepet.length})`;
    }
}

function icerigiIncele(id, urunAdi) {
    const dbProduct = localProductsPool.find(p => p.id === id);
    
    const dil = dbProduct ? dbProduct.programming_language : "Bilinmiyor";
    const gereksinim = dbProduct ? dbProduct.requirements : "Yok";
    const kaynakKod = dbProduct ? dbProduct.source_code : "// Kod bulunamadı.";
    const fiyat = dbProduct ? parseFloat(dbProduct.price) : 0;
    const kategori = dbProduct ? dbProduct.category : "kod";

    let modalIcerik = "";
    const isFree = fiyat === 0;

    if (isFree) {
        if (kategori === "tasarim") {
            modalIcerik = `
                <p style="color:#2ecc71; font-size: 0.9rem; margin-bottom: 10px;">🔓 Ücretsiz Tasarım (Canlı Önizleme Modu Aktif)</p>
                <div style="background: var(--preview-bg); border: 2px dashed var(--primary-purple); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; min-height: 150px; overflow: hidden;">
                    <div id="livePreviewContainer">${kaynakKod}</div>
                </div>
                <p style="color:var(--text-dim); font-size: 0.85rem; margin-bottom: 5px;">📦 Bileşen Kaynak Kodları:</p>
                <div style="background: var(--input-bg); border-radius:8px; border:1px solid var(--border-color); overflow: hidden;">
                    <pre style="padding:15px; font-family:monospace; text-align:left; white-space:pre-wrap; margin: 0; max-height: 180px; overflow-y: auto;"><code style="color:#2ecc71;">${kaynakKod.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>
                </div>
            `;
        } else {
            modalIcerik = `
                <p style="color:#2ecc71; font-size: 0.9rem; margin-bottom: 10px;">🔓 Ücretsiz Mod (Kopyalayebilir veya İnceleyebilirsiniz)</p>
                <div style="background: var(--input-bg); border-radius:8px; border:1px solid var(--border-color); overflow: hidden;">
                    <pre style="padding:15px; font-family:monospace; text-align:left; white-space:pre-wrap; margin: 0; max-height: 300px; overflow-y: auto;"><code style="color:#2ecc71;">${kaynakKod.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>
                </div>
            `;
        }
    } else {
        const kodSatirlari = kaynakKod.split('\n');
        const kisitliKod = kodSatirlari.slice(0, 4).join('\n');

        if (kategori === "tasarim") {
            modalIcerik = `
                <p style="color:#f1c40f; font-size: 0.9rem; margin-bottom: 10px;">💎 Premium Canlı Demo (Tasarım Önizlemesi Aktif, Kod Kilitli)</p>
                <div style="background: var(--preview-bg); border: 2px dashed #f1c40f; border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; min-height: 150px; overflow: hidden;">
                    <div id="livePreviewContainer">${kaynakKod}</div>
                </div>
                <p style="color: #e74c3c; font-size: 0.85rem; margin-bottom: 5px;">🔒 Kaynak Kod Önizlemesi Sınırlandırıldı:</p>
                <div style="position: relative; background: var(--input-bg); border-radius:8px; border:1px solid var(--border-color); overflow: hidden;">
                    <pre style="padding:15px; font-family:monospace; text-align:left; white-space:pre-wrap; margin: 0;"><code style="color:#e74c3c;">${kisitliKod.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
// [PRO_GUARD] İçeriğin devamı şifrelenmiştir...
// Satın aldıktan sonra kod paketinize otomatik eklenecektir.</code></pre>
                    <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 50px; background: linear-gradient(to bottom, transparent, var(--card-bg)); backdrop-filter: blur(1px); display: flex; align-items: center; justify-content: center;">
                        <span style="color: #f1c40f; font-size: 0.8rem; font-weight: bold;">⚠️ Kodu almak için ürünü satın almalısınız.</span>
                    </div>
                </div>
            `;
        } else {
            modalIcerik = `
                <p style="color:#e74c3c; font-size: 0.9rem; margin-bottom: 10px;">🔒 Önizleme Modu (Kopyalama ve Canlı Render Engellenmiştir)</p>
                <div style="position: relative; background: var(--input-bg); border-radius:8px; border:1px solid var(--border-color); overflow: hidden;">
                    <pre style="padding:15px; font-family:monospace; text-align:left; white-space:pre-wrap; margin: 0;"><code style="color:#e74c3c;">${kisitliKod.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
// ...
// ...</code></pre>
                    <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 60px; background: linear-gradient(to bottom, transparent, var(--card-bg)); backdrop-filter: blur(2px); display: flex; align-items: center; justify-content: center;">
                        <span style="color: #e74c3c; font-size: 0.85rem; font-weight: bold; background: var(--card-bg); padding: 4px 12px; border-radius: 20px; border: 1px solid #e74c3c;">⚠️ Devamını görmek ve demoyu çalıştırmak için satın almalısınız.</span>
                    </div>
                </div>
            `;
        }
    }

    const inceleModal = document.createElement("div");
    inceleModal.id = "inceleModal";
    Object.assign(inceleModal.style, {
        position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
        backgroundColor: "rgba(0,0,0,0.85)", zIndex: "20000",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px", boxSizing: "border-box"
    });

    inceleModal.innerHTML = `
        <div style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 30px; border-radius: 12px; width: 100%; max-width: 700px; max-height: 90vh; overflow-y: auto; color: var(--text-main); box-shadow: 0 0 20px rgba(137, 87, 229, 0.2); position: relative; ${!isFree ? 'user-select: none; -webkit-user-select: none;' : ''}" 
             ${!isFree ? 'oncontextmenu="return false;" oncopy="return false;" onselectstart="return false;"' : ''}>
            <h2 style="margin-top:0; color: var(--primary-purple);">${urunAdi}</h2>
            <div style="margin-bottom: 15px; font-size: 0.95rem; background: var(--input-bg); padding: 10px; border-radius: 6px; border: 1px solid var(--border-color);">
                <span style="background: var(--primary-purple); color: white; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 0.8rem; margin-right: 10px;">Varlık Türü / Dil: ${dil}</span>
                <span style="color: var(--text-dim);">⚙️ Uyumluluk: ${gereksinim}</span>
            </div>
            ${modalIcerik}
            <button id="closeInceleBtn" style="margin-top:20px; padding:12px 24px; background:#e74c3c; border:none; color:white; border-radius:6px; cursor:pointer; font-weight:bold; width: 100%; transition: 0.2s; box-shadow: 0 4px 10px rgba(231,76,60,0.2);" onmouseover="this.style.background='#c0392b'" onmouseout="this.style.background='#e74c3c'">İncelemeyi Kapat</button>
        </div>
    `;

    document.body.appendChild(inceleModal);
    document.body.style.overflow = "hidden";
    
    const preventCopy = (e) => {
        if (!isFree && e.ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'a' || e.key === 'A')) {
            e.preventDefault();
            showToast("Bu alanda kopyalama yapmak yasaktır!", "error");
        }
    };
    window.addEventListener('keydown', preventCopy);

    document.getElementById("closeInceleBtn").addEventListener("click", () => {
        inceleModal.remove();
        window.removeEventListener('keydown', preventCopy);
        document.body.style.overflow = "auto";
    });
}

function satinalSimulasyonu() {
    if (sepet.length === 0) {
        showToast("Sepetiniz boş! Önce ürün ekleyin.", "error");
        return;
    }

    const modal = document.createElement("div");
    modal.id = "bankaModal";
    Object.assign(modal.style, {
        position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
        backgroundColor: "rgba(0,0,0,0.85)", zIndex: "15000",
        display: "flex", alignItems: "center", justifyContent: "center"
    });

    modal.innerHTML = `
        <div style="background: var(--card-bg); border: 2px solid var(--border-color); padding: 40px; border-radius: 15px; text-align: center; color: var(--text-main); width: 450px; box-shadow: 0 0 25px rgba(137, 87, 229, 0.3);">
            <h2 style="color: var(--primary-purple); margin-top: 0;">Orixa Ödeme Geçidi</h2>
            <p style="color: var(--text-dim);">Güvenli simüle banka bağlantısı kuruluyor...</p>
            <div style="margin: 25px 0; font-size: 1.2rem;">Toplam Tutar: <span style="color: #2ecc71; font-weight: bold;">₺${toplamTutar.toFixed(2)}</span></div>
            <div id="islemDurumu" style="font-weight: bold; color: #f1c40f; margin-bottom: 25px;">🔄 Kart Bilgileri Doğrulanıyor...</div>
            <button id="closeModalBtn" style="padding: 12px 25px; background: var(--input-bg); border: 1px solid var(--border-color); color: var(--text-main); border-radius: 8px; cursor: pointer; display: none; font-weight: bold; width: 100%;">Paneli Kapat</button>
        </div>
    `;

    document.body.appendChild(modal);

    setTimeout(() => {
        const durum = document.getElementById("islemDurumu");
        if (durum) durum.innerHTML = "💸 Ödeme Onaylandı! Varlık Paketiniz Hazırlanıyor...";
    }, 1500);

    setTimeout(() => {
        const durum = document.getElementById("islemDurumu");
        if (durum) durum.innerHTML = "✅ İşlem Başarılı! Kaynak kodlar ve tasarımlar indirildi.";
        
        const closeBtn = document.getElementById("closeModalBtn");
        if (closeBtn) closeBtn.style.display = "block";

        let dosyaIcerigi = "==================================================\n";
        dosyaIcerigi += "   ORIXA DEVELOPER MARKET - PROJE KAYNAK PAKETLERI   \n";
        dosyaIcerigi += "==================================================\n\n";

        sepet.forEach((urun, index) => {
            const dbProduct = localProductsPool.find(p => p.id === urun.id);
            const dil = dbProduct ? dbProduct.programming_language : "Bilinmiyor";
            const gereksinim = dbProduct ? dbProduct.requirements : "Yok";
            const kod = dbProduct ? dbProduct.source_code : "// Kod yok.";
            
            dosyaIcerigi += `/* ===============================================\n`;
            dosyaIcerigi += `   [VARLIK HÜCRESİ ${index + 1}]: ${urun.urunAdi}\n`;
            dosyaIcerigi += `   TÜR / TEKNOLOJİ: ${dil}\n`;
            dosyaIcerigi += `   GEREKSİNİMLER: ${gereksinim}\n`;
            dosyaIcerigi += `   =============================================== */\n\n`;
            dosyaIcerigi += `${kod}\n\n\n`;
        });

        dosyaIcerigi += "/* Orixa Tercih Ettiğiniz İçerik İçin Teşekkür Ederiz. */\n";

        const gizliLink = document.createElement("a");
        gizliLink.href = "data:text/plain;charset=utf-8," + encodeURIComponent(dosyaIcerigi);
        gizliLink.download = "Orixa_Gelistirici_Paketi.txt";
        document.body.appendChild(gizliLink);
        gizliLink.click();
        document.body.removeChild(gizliLink);
        showToast("Gerçek kaynak kod dosyası indirildi!", "success");
    }, 3500);

    document.getElementById("closeModalBtn").addEventListener("click", () => {
        modal.remove();
        sepet = [];
        toplamTutar = 0;
        localStorage.removeItem("cart"); 
        location.reload();
    });
}

function temaDegistir() {
    document.body.classList.toggle('light-mode');
    const mod = document.body.classList.contains('light-mode') ? "Aydınlık" : "Karanlık";
    showToast(`${mod} Mod Aktif Edildi`, "success");
    localStorage.setItem('tema', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('tema') === 'light') {
        document.body.classList.add('light-mode');
    }

    oturumArayuzunuGuncelle();

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = loginForm.querySelector('input[type="text"]').value;
            const password = loginForm.querySelector('input[type="password"]').value;

            try {
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const result = await response.json();
                if (response.ok) {
                    showToast(`Hoş geldin ${username}! Oturum doğrulanıyor...`, "success");
                    localStorage.setItem('user', JSON.stringify(result.user));
                    
                    if (result.user.is_admin === 1) {
                        setTimeout(() => { window.location.href = '/admin'; }, 1200);
                        return;
                    }

                    const bekleyenSepet = JSON.parse(localStorage.getItem("cart")) || [];
                    setTimeout(() => { 
                        if (bekleyenSepet.length > 0) {
                            window.location.href = '/odeme';
                        } else {
                            window.location.href = '/'; 
                        }
                    }, 1500);
                } else {
                    showToast(result.error, "error");
                    
                    if (result.error === "Hatalı şifre!" && !document.getElementById("forgotPasswordBtn")) {
                        const forgotBtn = document.createElement("button");
                        forgotBtn.id = "forgotPasswordBtn";
                        forgotBtn.innerText = "🔑 Şifremi Unuttum (Gmail Sıfırlama Gönder)";
                        Object.assign(forgotBtn.style, {
                            background: "transparent", border: "none", color: "#38bdf8",
                            cursor: "pointer", fontSize: "0.85rem", marginTop: "10px",
                            textDecoration: "underline", fontWeight: "bold"
                        });
                        
                        forgotBtn.onclick = async () => {
                            const emailInput = prompt("Lütfen sistemde kayıtlı e-posta (Gmail) adresinizi girin:");
                            if(emailInput) {
                                try {
                                    const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ email: emailInput })
                                    });
                                    const mailRes = await res.json();
                                    if(res.ok) alert(mailRes.message); else alert(mailRes.error);
                                } catch { alert("Sıfırlama sunucusuna bağlanılamadı."); }
                            }
                        };
                        loginForm.appendChild(forgotBtn);
                    }
                }
            } catch (error) {
                showToast("Sunucuya bağlanılamadı! Python app.py çalışıyor mu?", "error");
            }
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('regUsername').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;

            try {
                showToast("Hesap oluşturuluyor, lütfen bekleyin...", "success");
                const response = await fetch(`${API_BASE_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password })
                });
                const result = await response.json();

                if (response.ok) {
                    showToast("Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz.", "success");

                    setTimeout(() => { window.location.href = '/login'; }, 2000);
                } else {
                    showToast(result.error, "error");
                }
            } catch (error) {
                showToast("Kayıt sunucusuna bağlanılamadı!", "error");
            }
        });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keyup', () => {
            const term = searchInput.value.toLowerCase();
            const cards = document.querySelectorAll('.product-card');
            cards.forEach(card => {
                const title = card.querySelector('h3').innerText.toLowerCase();
                const desc = card.querySelector('p') ? card.querySelector('p').innerText.toLowerCase() : "";
                if (title.includes(term) || desc.includes(term)) {
                    card.style.display = "";
                } else {
                    card.style.display = "none";
                }
            });
        });
    }

    if (document.getElementById('productContainer')) { urunleriGetir(); }
    if (document.getElementById('tableBody')) { tabloyuDoldur(); }


    setTimeout(() => {
        const sepetButonu = document.querySelector('.nav-btn');
        if (sepetButonu) {
            sepetButonu.addEventListener('click', (e) => {
                if (sepetButonu.getAttribute('onclick') === 'oturumuKapat()') return;
                
                e.preventDefault();
                const aktifKullanici = JSON.parse(localStorage.getItem("user"));
                
                if (sepet.length === 0) {
                    showToast("Sepetiniz boş! Önce ürün ekleyin.", "error");
                    return;
                }
                
                if (!aktifKullanici || !aktifKullanici.email) {
                    alert("Satın alma aşamasına geçebilmek için önce giriş yapmalısınız!\nSepetiniz güvenle hafızaya kilitlendi.");
                    window.location.href = "/login"; 
                } else {
                    window.location.href = "/odeme"; 
                }
            });
        }
    }, 500);
});

function showToast(message, type) {
    const toast = document.createElement("div");
    toast.innerText = message;
    const styles = {
        position: "fixed", bottom: "20px", right: "20px",
        padding: "15px 25px", borderRadius: "10px", color: "white",
        zIndex: "10000", fontWeight: "bold", boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
        transition: "all 0.5s ease"
    };
    Object.assign(toast.style, styles);
    toast.style.background = (type === "success") 
        ? "linear-gradient(45deg, #8957e5, #2563eb)" 
        : "linear-gradient(45deg, #e74c3c, #c0392b)";
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

async function urunleriGetir() {
    const container = document.getElementById('productContainer');
    if (!container) return;

    const gradients = [
        ['#8957e5', '#3b82f6'],
        ['#10b981', '#3b82f6'],
        ['#6366f1', '#a855f7'],
        ['#ec4899', '#f43f5e']
    ];

    try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const products = await response.json();
        
        localProductsPool = [...products];

        if (products.length === 0) {
            container.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Henüz veritabanında ürün bulunmuyor.</p>";
            return;
        }

        const currentFile = window.location.pathname.split("/").pop();
        let filteredProducts = products;

        if (currentFile === "kodlar.html") {
            filteredProducts = products.filter(p => p.category !== 'tasarim');
        } else if (currentFile === "tasarimlar.html") {
            filteredProducts = products.filter(p => p.category === 'tasarim');
        }

        if (filteredProducts.length === 0) {
            container.innerHTML = "<p style='grid-column: 1/-1; text-align:center;'>Bu kategoriye ait varlık bulunamadı.</p>";
            return;
        }

        container.innerHTML = filteredProducts.map(product => {
            const randomGrad = gradients[product.id % gradients.length];
            const fiyat = parseFloat(product.price);
            const vitrinIkonu = product.category === 'tasarim' ? '🎨' : '💻';
            const safeProductName = product.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            
            const butonMetni = fiyat === 0 
                ? `<button class="buy-btn" onclick="sepeteEkle('${safeProductName}', 0, ${product.id})" style="flex: 1; padding: 10px; background:#2ecc71; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">🎁 Ücretsiz</button>`
                : `<button class="buy-btn" onclick="sepeteEkle('${safeProductName}', ${fiyat}, ${product.id})" style="flex: 1; padding: 10px; background:linear-gradient(135deg, #8957e5, #2563eb); color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">🛒 ₺${fiyat.toFixed(0)}</button>`;

            return `
                <div class="product-card" style="background:#0f172a; border:1px solid #1e293b; border-radius:12px; overflow:hidden;">
                    <div class="product-img" style="background: linear-gradient(135deg, ${randomGrad[0]} 0%, ${randomGrad[1]} 100%); display: flex; align-items: center; justify-content: center; padding:40px;">
                        <span style="font-size: 3rem; opacity: 0.3;">${vitrinIkonu}</span>
                    </div>
                    <div class="product-body" style="padding:20px; color:white;">
                        <span class="badge" style="${fiyat === 0 ? 'background:rgba(46, 204, 113, 0.2); color:#2ecc71;' : 'background:#1e1b4b; color:#a855f7;'} padding:4px 8px; border-radius:4px; font-size:0.75rem; font-weight:bold;">
                            ${fiyat === 0 ? 'FREE' : product.category.toUpperCase()}
                        </span>
                        <h3 style="margin:10px 0 5px 0; font-size:1.2rem;">${product.name}</h3>
                        <p style="color:var(--text-dim); font-size:0.9rem; margin-bottom:15px; height: 45px; overflow: hidden;">${product.description || 'Harika optimize geliştirici bileşeni.'}</p>
                        <div style="display: flex; gap: 10px; margin-top: 20px;">
                            <button onclick="icerigiIncele(${product.id}, '${safeProductName}')" style="flex: 1; padding: 10px; background: var(--input-bg); border: 1px solid var(--border-color); color: var(--text-main); border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.3s;" onmouseover="this.style.borderColor='var(--primary-purple)'" onmouseout="this.style.borderColor='var(--border-color)'">🔍 İncele</button>
                            ${butonMetni}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Hata:", error);
        container.innerHTML = "<p style='grid-column: 1/-1; text-align:center; color: #e74c3c;'>Backend sunucusuna bağlanılamadı!</p>";
    }
}

async function tabloyuDoldur() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const productsData = await response.json();

        localProductsPool = [...productsData];

        if (productsData.length === 0) {
            tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding:20px;'>Veri bulunamadı.</td></tr>";
            return;
        }

        tbody.innerHTML = productsData.map(urun => {
            const fiyat = parseFloat(urun.price);
            const fiyatMetni = fiyat === 0 ? "<span style='color:#2ecc71; font-weight:bold;'>Ücretsiz</span>" : `₺${fiyat.toFixed(2)}`;
            const safeUrunName = urun.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const satisMiktari = urun.sales !== undefined ? urun.sales : (urun.id * 3 + 1);
            
            return `
                <tr style="border-bottom: 1px solid var(--border-color); transition: 0.3s;" onmouseover="this.style.background='var(--input-bg)'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 15px; font-family: monospace; color: var(--primary-purple);">${urun.id}</td>
                    <td style="padding: 15px; font-weight: bold; color: var(--text-main);">${urun.name}</td>
                    <td style="padding: 15px;"><span class="badge" style="${fiyat === 0 ? 'background:rgba(46, 204, 113, 0.2); color:#2ecc71;' : ''}">${urun.category.toUpperCase()}</span></td>
                    <td style="padding: 15px; color: var(--neon-blue);">${fiyatMetni}</td>
                    <td style="padding: 15px; color: #2ecc71; font-weight:bold;">${satisMiktari} Birim</td>
                    <td style="padding: 15px;">
                        <button onclick="silmeIsleminiTetikle(${urun.id}, '${safeUrunName}')" 
                                style="background: none; border: 1px solid #e74c3c; color: #e74c3c; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-weight: bold; transition: 0.2s;"
                                onmouseover="this.style.background='#e74c3c', this.style.color='white'" onmouseout="this.style.background='transparent', this.style.color='#e74c3c'">
                            Kaldır
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        tbody.innerHTML = "<tr><td colspan='6' style='text-align:center; color:#e74c3c; padding:20px;'>Veritabanından canlı analiz verileri çekilemedi!</td></tr>";
    }
}

async function silmeIsleminiTetikle(id, urunAdi) {
    if (confirm(`"${urunAdi}" isimli bileşeni sitemizden kalıcı olarak kaldırmak istediğinize emin misiniz?`)) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            if (response.ok) {
                showToast(result.message || "Bileşen başarıyla kaldırıldı.", "success");
                tabloyuDoldur(); 
            } else {
                showToast(result.error || "Silme işlemi sırasında yetki/sunucu hatası oluştu.", "error");
            }
        } catch (error) {
            showToast("Silme isteği sunucuya ulaştırılamadı!", "error");
        }
    }
}